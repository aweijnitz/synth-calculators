import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import DiodeSeriesPage from '../../app/calculators/diode-series/page';

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

describe('DiodeSeriesPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/diode-series');
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
        <DiodeSeriesPage />
      </CssVarsProvider>
    );

  it('prefills Vf and shows the helper note', () => {
    renderWithProviders();
    expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
    expect(screen.getByText(/LEDs commonly have Vf between/i)).toBeInTheDocument();
  });

  it('computes the resistor and shows E24 neighbors when R is missing', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Vs (V)'), '5'));
    await runWithAct(() => user.clear(screen.getByLabelText('Vf (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('Vf (V)'), '2'));
    await runWithAct(() => user.type(screen.getByLabelText('If (A)'), '10m'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('300Ω')).toBeInTheDocument());
    expect(screen.getByText(/Nearest E24/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Below 270Ω/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Above 330Ω/ })).toBeInTheDocument();
  });

  it('computes the current when it is the missing field', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Vs (V)'), '9'));
    await runWithAct(() => user.type(screen.getByLabelText('R (Ω)'), '1k'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('8.30 mA')).toBeInTheDocument());
  });

  it('hydrates from query params and updates the URL when editing', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      createSearchParams({ vs: '5', vf: '2', if: '10m', r: '' })
    );
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();

    await runWithAct(() => user.type(screen.getByLabelText('R (Ω)'), '300'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('vs=5');
    expect(latestCall[0]).toContain('vf=2');
    expect(latestCall[0]).toContain('r=300');
  });

  it('copies the summary via the Copy All button', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.type(screen.getByLabelText('Vs (V)'), '5'));
    await runWithAct(() => user.clear(screen.getByLabelText('Vf (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('Vf (V)'), '2'));
    await runWithAct(() => user.type(screen.getByLabelText('If (A)'), '10m'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy All' })).toBeEnabled());

    await runWithAct(() => user.click(screen.getByRole('button', { name: 'Copy All' })));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('If: 10.0 mA'));
    clipboardSpy.mockRestore();
  });
});
