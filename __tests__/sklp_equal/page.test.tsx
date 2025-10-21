import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import SallenKeyEqualResistorPage from '../../app/calculators/sallen-key-lp-equal-r/page';
import theme from '../../app/theme';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

const chartMock = jest.fn((props: Record<string, unknown>) => props);

jest.mock('../../components/charts/SkMultiResponse', () => (props: Record<string, unknown>) => {
  chartMock(props);
  return <div data-testid="sklp-equal-chart" />;
});

const { useSearchParams, useRouter, usePathname } = jest.requireMock('next/navigation') as {
  useSearchParams: MockedFunction<() => URLSearchParams>;
  useRouter: MockedFunction<() => { replace: jest.Mock }>;
  usePathname: MockedFunction<() => string>;
};

const createSearchParams = (values: Record<string, string> = {}) => {
  const params = new URLSearchParams(values);
  return {
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
  } as unknown as URLSearchParams;
};

const runWithAct = async (operation: () => Promise<void>) => {
  await act(async () => {
    await operation();
  });
};

describe('Sallen-Key equal resistor page', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    chartMock.mockClear();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/sallen-key-lp-equal-r');
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams());
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderWithProviders = () =>
    render(
      <CssVarsProvider theme={theme} defaultMode="light">
        <SallenKeyEqualResistorPage />
      </CssVarsProvider>,
    );

  it('computes sweep and updates chart after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitor C1'), '10n'));
    await runWithAct(() => user.type(screen.getByLabelText('Capacitor C2'), '10n'));
    await runWithAct(() => user.type(screen.getByLabelText('Potentiometer Max (per gang)'), '50k'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Q =/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Cutoff sweep/)).toBeInTheDocument();
    });

    const lastCall = chartMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [chartProps] = lastCall ?? [{} as Record<string, unknown>];
    expect(Array.isArray(chartProps.series)).toBe(true);
    expect((chartProps.series as unknown[])).toHaveLength(5);
    const labels = (chartProps.series as Array<{ label: string }>).map((item) => item.label);
    expect(labels).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });

  it('hydrates from query params and syncs updates back to the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      createSearchParams({ c1: '4.7n', c2: '1n', rpot: '50k', rst: '100', rsb: '220' }),
    );
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('4.7n')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1n')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50k')).toBeInTheDocument();

    const bottomField = screen.getByLabelText('Series Resistor (bottom)');
    await runWithAct(() => user.clear(bottomField));
    await runWithAct(() => user.type(bottomField, '330'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('c1=4.7n');
    expect(latestCall[0]).toContain('c2=1n');
    expect(latestCall[0]).toContain('rpot=50k');
    expect(latestCall[0]).toContain('rst=100');
    expect(latestCall[0]).toContain('rsb=330');
  });
});
