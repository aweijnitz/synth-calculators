import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import Page from '../../app/calculators/sallen-key-lp-equal-r-pot/page';
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
  return <div data-testid="sklp-equal-pot-chart" />;
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

describe('Sallen-Key equal pot page', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    chartMock.mockClear();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/sallen-key-lp-equal-r-pot');
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
        <Page />
      </CssVarsProvider>,
    );

  it('computes capacitor pair and updates chart after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Target f₀ @ 50%'), '1k'));
    await runWithAct(() => user.type(screen.getByLabelText('Dual-gang Pot Value'), '50k'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/C1 =/)).toBeInTheDocument();
      expect(screen.getByText(/C2 =/)).toBeInTheDocument();
    });

    const lastCall = chartMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [chartProps] = lastCall ?? [{} as Record<string, unknown>];
    expect(Array.isArray(chartProps.series)).toBe(true);
    expect((chartProps.series as unknown[])).toHaveLength(5);
    const labels = (chartProps.series as Array<{ label: string }>).map((item) => item.label);
    expect(labels).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });

  it('hydrates from query params and syncs updates to the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams({ f50: '1k', rpot: '50k', cbase: '10n' }));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('1k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10n')).toBeInTheDocument();

    const seedField = screen.getByLabelText('Capacitor Seed (optional)');
    await runWithAct(() => user.clear(seedField));
    await runWithAct(() => user.type(seedField, '4.7n'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('f50=1k');
    expect(latestCall[0]).toContain('rpot=50k');
    expect(latestCall[0]).toContain('cbase=4.7n');
  });
});
