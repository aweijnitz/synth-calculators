import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import CapacitorConverterPage from '../../app/calculators/capacitor-converter/page';

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

describe('CapacitorConverterPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/capacitor-converter');
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
        <CapacitorConverterPage />
      </CssVarsProvider>
    );

  it('computes conversions after debounce', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitance'), '22n'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getAllByText('22000 pF')).not.toHaveLength(0);
      expect(screen.getAllByText('22.0 nF')).not.toHaveLength(0);
      expect(screen.getByText('0.0220 uF')).toBeInTheDocument();
      expect(screen.getByText('2.20e-8 F')).toBeInTheDocument();
    });
  });

  it('shows validation error for unsupported suffix', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitance'), '1P'));

    await waitFor(() =>
      expect(screen.getAllByText(/Only p, n, u, m suffixes are supported/)).not.toHaveLength(0)
    );
  });

  it('copies the nearest E6 value when chip is clicked', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitance'), '22n'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByRole('button', { name: '22.0 nF' })).toBeInTheDocument());

    await runWithAct(() => user.click(screen.getByRole('button', { name: '22.0 nF' })));

    expect(clipboardSpy).toHaveBeenCalledWith('22.0 nF');
    clipboardSpy.mockRestore();
  });

  it('copies the summary when Copy All is pressed', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Capacitance'), '22n'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy All' })).toBeEnabled());

    await runWithAct(() => user.click(screen.getByRole('button', { name: 'Copy All' })));

    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('Input: 22nF'));
    clipboardSpy.mockRestore();
  });

  it('hydrates from query params and syncs back to the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams({ c: '22n' }));
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('22n')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getAllByText('22000 pF')).not.toHaveLength(0));

    await runWithAct(() => user.type(screen.getByLabelText('Capacitance'), '0'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('c=22n0');
  });
});
