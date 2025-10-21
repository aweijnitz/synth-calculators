import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import SallenKeyLowpassPage from '../../app/calculators/sallen-key-lowpass/page';
import theme from '../../app/theme';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

const chartMock = jest.fn((props: Record<string, unknown>) => props);

jest.mock('../../components/charts/FrequencyResponseChart', () => (props: Record<string, unknown>) => {
  chartMock(props);
  return <div data-testid="frequency-response-chart" />;
});

type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

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

describe('Sallen-Key Low-pass page', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    chartMock.mockClear();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/sallen-key-lowpass');
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
        <SallenKeyLowpassPage />
      </CssVarsProvider>
    );

  it('computes component values and updates the chart after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    const fcField = screen.getByLabelText('Cutoff Frequency (f_c)');
    await runWithAct(() => user.clear(fcField));
    await runWithAct(() => user.type(fcField, '1k'));

    const qField = screen.getByLabelText('Quality Factor (Q)');
    await runWithAct(() => user.clear(qField));
    await runWithAct(() => user.type(qField, '0.707'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/Recomputed f_c =/)).toBeInTheDocument();
      expect(screen.getByText(/R1 =/)).toBeInTheDocument();
      expect(screen.getByText(/R2 =/)).toBeInTheDocument();
    });

    const lastCall = chartMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [chartProps] = lastCall ?? [{} as Record<string, unknown>];
    expect(chartProps).toMatchObject({ mode: 'lowpass' });
    expect(chartProps.fcHz as number).toBeGreaterThan(900);
    expect(chartProps.fcHz as number).toBeLessThan(1_100);
  });

  it('hydrates from query params and syncs back to the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams({ fc: '2k', q: '0.5', ratio: '3.3' }));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('2k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    expect(screen.getByLabelText('C1:C2 Ratio')).toBeInTheDocument();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitor Seed (C_base)'), '1n'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestTarget = routerReplace.mock.calls.at(-1) as [string];
    expect(latestTarget[0]).toContain('fc=2k');
    expect(latestTarget[0]).toContain('q=0.5');
    expect(latestTarget[0]).toContain('cbase=1n');
    expect(latestTarget[0]).toContain('ratio=3.3');
  });
});
