import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '../../app/theme';
import PotBiasCalculatorPage from '../../app/calculators/pot-bias/page';

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

describe('PotBiasCalculatorPage', () => {
  const routerReplace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    routerReplace.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ replace: routerReplace });
    (usePathname as jest.Mock).mockReturnValue('/calculators/pot-bias');
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
        <PotBiasCalculatorPage />
      </CssVarsProvider>
    );

  it('prefills default values and computes initial results', async () => {
    renderWithProviders();

    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('2.86kΩ')).toBeInTheDocument());
    expect(screen.getByText('4.29kΩ')).toBeInTheDocument();
  });

  it('updates results and shows neighbors after input change', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.clear(screen.getByLabelText('V_TOP_TARGET (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('V_TOP_TARGET (V)'), '9'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getAllByText(/Nearest E24/)).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: /Below/ })).not.toHaveLength(0);
  });

  it('hydrates from query params and pushes updates to the URL', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      createSearchParams({ vs_hi: '15', vs_lo: '1', vtop: '12', vbot: '4', rpot: '20k' })
    );
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20k')).toBeInTheDocument();

    await runWithAct(() => user.clear(screen.getByLabelText('V_BOT_TARGET (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('V_BOT_TARGET (V)'), '5'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(routerReplace).toHaveBeenCalled());
    const latestCall = routerReplace.mock.calls.at(-1) as [string];
    expect(latestCall[0]).toContain('vs_hi=15');
    expect(latestCall[0]).toContain('vbot=5');
  });

  it('copies the summary via the Copy All button', async () => {
    const clipboardSpy = jest.spyOn(navigator.clipboard!, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy All' })).toBeEnabled());

    await runWithAct(() => user.click(screen.getByRole('button', { name: 'Copy All' })));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('R_TOP: 2.86kΩ'));
    clipboardSpy.mockRestore();
  });

  it('shows validation errors when targets are misordered', async () => {
    const user = userEvent.setup({ writeToClipboard: false, advanceTimers: jest.advanceTimersByTime });
    renderWithProviders();

    await runWithAct(() => user.clear(screen.getByLabelText('V_BOT_TARGET (V)')));
    await runWithAct(() => user.type(screen.getByLabelText('V_BOT_TARGET (V)'), '11'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('Must be less than V_TOP_TARGET.')).toBeInTheDocument());
  });
});
