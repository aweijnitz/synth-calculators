import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import OpAmpGainPage from '../../app/calculators/opamp-gain/page';

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

describe('OpAmpGainPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/opamp-gain');
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
        <OpAmpGainPage />
      </CssVarsProvider>
    );

  it('computes gain after debounce when two resistors are entered', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Rin'), '10k');
    await user.type(screen.getByLabelText('Rf'), '47k');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/-4\.7/)).toBeInTheDocument();
    });
  });

  it('switches formulas when toggling mode', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Rin'), '10k');
    await user.type(screen.getByLabelText('Rf'), '47k');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(screen.getByText(/-4\.7/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Non-inverting' }));
    await waitFor(() => expect(screen.getByText(/5\.7/)).toBeInTheDocument());
  });

  it('prefills inputs from query params and updates the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      createSearchParams({ mode: 'non-inverting', rin: '10k', gain: '3' })
    );
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('10k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Rf'), '22k');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('rin=10k');
    expect(latestCall[0]).toContain('rf=22k');
    expect(latestCall[0]).toContain('gain=3');
  });

  it('copies E24 neighbor values when chips are clicked', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await user.type(screen.getByLabelText('Gain (V/V)'), '-2');
    await user.type(screen.getByLabelText('Rin'), '12k');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText(/Nearest E24/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Above/ }));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('kΩ'));
    clipboardSpy.mockRestore();
  });
});
