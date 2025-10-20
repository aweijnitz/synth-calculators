import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import RcFilterCalculatorPage from '../../app/calculators/rc-filter/page';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

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
    toString: () => params.toString()
  } as unknown as URLSearchParams;
};

describe('RcFilterCalculatorPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/rc-filter');
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
        <RcFilterCalculatorPage />
      </CssVarsProvider>
    );

  it('computes cutoff frequency after debounce when resistance and capacitance are provided', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Resistance (R)'), '10k');
    await user.type(screen.getByLabelText('Capacitance (C)'), '47n');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('338.63Hz')).toBeInTheDocument();
    });
  });

  it('preserves the computed value when toggling modes', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Resistance (R)'), '10k');
    await user.type(screen.getByLabelText('Capacitance (C)'), '47n');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('338.63Hz')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'High-pass' }));
    await waitFor(() => expect(screen.getByText('338.63Hz')).toBeInTheDocument());
  });

  it('hydrates from query params and updates the URL when inputs change', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams({ mode: 'highpass', r: '12k', c: '10n' }));
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('12k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10n')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cutoff Frequency (f_c)'), '1k');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('mode=highpass');
    expect(latestCall[0]).toContain('r=12k');
    expect(latestCall[0]).toContain('c=10n');
    expect(latestCall[0]).toContain('fc=1k');
  });

  it('copies neighbor values to the clipboard when chips are clicked', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Capacitance (C)'), '47n');
    await user.type(screen.getByLabelText('Cutoff Frequency (f_c)'), '1k');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText(/Nearest E24/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Above/ }));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('kΩ'));
    clipboardSpy.mockRestore();
  });
});
