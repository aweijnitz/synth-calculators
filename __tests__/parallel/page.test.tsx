import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import ParallelResistorsPage from '../../app/calculators/parallel-resistors/page';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
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
    toString: () => params.toString(),
  } as unknown as URLSearchParams;
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const run = async (operation: () => Promise<void>) => {
  await act(async () => {
    await operation();
  });
};

describe('ParallelResistorsPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/parallel-resistors');
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
        <ParallelResistorsPage />
      </CssVarsProvider>
    );

  it('computes equivalent resistance after debounce', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await run(() => user.type(screen.getByLabelText('R1 (Ω)'), '2.2k'));
    await run(() => user.type(screen.getByLabelText('R2 (Ω)'), '4.7k'));

    await advance(300);

    await waitFor(() => {
      expect(screen.getByText(/R_parallel ≈/)).toHaveTextContent(/kΩ/);
      expect(screen.getByRole('button', { name: /Copy All/i })).not.toBeDisabled();
    });
  });

  it('shows validation errors for invalid suffix', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await run(() => user.type(screen.getByLabelText('R1 (Ω)'), '1K'));

    await waitFor(() => {
      expect(screen.getByText(/Ω, k, or M/)).toBeInTheDocument();
    });
  });

  it('hydrates from query params and updates the URL after debounce', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(createSearchParams({ r1: '2k', r2: '3k' }));
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });

    renderWithProviders();

    expect(screen.getByDisplayValue('2k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3k')).toBeInTheDocument();

    await run(() => user.type(screen.getByLabelText('R2 (Ω)'), '2'));
    await advance(300);

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const lastCall = routerReplace.mock.calls.at(-1) as [string, { scroll: boolean }];
    expect(lastCall[0]).toContain('r1=2k');
    expect(lastCall[0]).toContain('r2=3k2');
  });

  it('copies a summary with all values', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await run(() => user.type(screen.getByLabelText('R1 (Ω)'), '2.2k'));
    await run(() => user.type(screen.getByLabelText('R2 (Ω)'), '4.7k'));

    await advance(300);

    await run(() => user.click(screen.getByRole('button', { name: /Copy All/i })));

    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('R1: 2.2kΩ'));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('R2: 4.7kΩ'));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('R_parallel:'));

    clipboardSpy.mockRestore();
  });

  it('shows disproportionate note when resistors are far apart', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await run(() => user.type(screen.getByLabelText('R1 (Ω)'), '1M'));
    await run(() => user.type(screen.getByLabelText('R2 (Ω)'), '1k'));

    await advance(300);

    await waitFor(() => {
      expect(screen.getByText(/close to the smaller resistor/)).toBeInTheDocument();
    });
  });
});
