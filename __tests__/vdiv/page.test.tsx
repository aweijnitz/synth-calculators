import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import VoltageDividerCalculatorPage from '../../app/calculators/voltage-divider/page';

type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

const { useSearchParams, useRouter, usePathname } = jest.requireMock('next/navigation') as {
  useSearchParams: MockedFunction<() => URLSearchParams>;
  useRouter: MockedFunction<() => { replace: jest.Mock }>;
  usePathname: MockedFunction<() => string>;
};

const createSearchParams = (values: Record<string, string> = {}) => {
  const params = new URLSearchParams(values);
  return {
    get: (key: string) => params.get(key),
    toString: () => params.toString()
  } as unknown as URLSearchParams;
};

const runWithAct = async (operation: () => Promise<void>) => {
  await act(async () => {
    await operation();
  });
};

describe('VoltageDividerCalculatorPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/voltage-divider');
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderWithProviders = () =>
    render(
      <CssVarsProvider theme={theme} defaultMode="light">
        <VoltageDividerCalculatorPage />
      </CssVarsProvider>
    );

  it('prefills default rail voltages', () => {
    renderWithProviders();
    expect(screen.getByDisplayValue('11.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('computes Volt_out after debounce when resistances are provided', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('R1 (Ω)'), '8.2k'));
    await runWithAct(() => user.type(screen.getByLabelText('R2 (Ω)'), '3.3k'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('3.30 V')).toBeInTheDocument());
  });

  it('computes R2 and shows E24 neighbors when R2 is cleared', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.clear(screen.getByLabelText('Volt_high (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('Volt_high (V)'), '5'));
    await runWithAct(() => user.type(screen.getByLabelText('R1 (Ω)'), '10k'));
    await runWithAct(() => user.type(screen.getByLabelText('Volt_out (V)'), '3.3'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText(/Nearest E24/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /Below/ })).not.toHaveLength(0);
  });

  it('hydrates from query params and updates the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      createSearchParams({ vh: '5', vl: '0', r1: '10k', r2: '20k' })
    );
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20k')).toBeInTheDocument();

    await runWithAct(() => user.type(screen.getByLabelText('Volt_out (V)'), '3.3'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('vh=5');
    expect(latestCall[0]).toContain('r1=10k');
    expect(latestCall[0]).toContain('vo=3.3');
  });

  it('copies the summary via the Copy All button', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('R1 (Ω)'), '10k'));
    await runWithAct(() => user.type(screen.getByLabelText('R2 (Ω)'), '15k'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy All' })).toBeEnabled());

    await runWithAct(() => user.click(screen.getByRole('button', { name: 'Copy All' })));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('Volt_high: 11.5 V'));
    clipboardSpy.mockRestore();
  });
});
