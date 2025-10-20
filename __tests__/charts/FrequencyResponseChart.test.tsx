import { render, screen } from '@testing-library/react';
import * as React from 'react';
import FrequencyResponseChart from '../../components/charts/FrequencyResponseChart';

const lineChartMock = jest.fn();
let capturedLineChartProps: any;
let capturedReferenceLineProps: any;

jest.mock('@mui/x-charts/LineChart', () => ({
  LineChart: (props: any) => {
    capturedLineChartProps = props;
    lineChartMock(props);
    return <div data-testid="line-chart">{props.children}</div>;
  },
}));

jest.mock('@mui/x-charts/ChartsReferenceLine', () => ({
  ChartsReferenceLine: (props: any) => {
    capturedReferenceLineProps = props;
    return <div data-testid="reference-line" data-x={props.x} data-label={props.label} />;
  },
}));

describe('FrequencyResponseChart', () => {
  beforeEach(() => {
    capturedLineChartProps = undefined;
    capturedReferenceLineProps = undefined;
    lineChartMock.mockClear();
  });

  it('renders an empty state when cutoff cannot be resolved', () => {
    render(<FrequencyResponseChart mode="lowpass" />);

    expect(
      screen.getByText('Enter any two values (R, C, f_c) to preview the response.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders an error message for invalid cutoff input', () => {
    render(<FrequencyResponseChart mode="highpass" fcHz={0} />);

    expect(
      screen.getByText('Cutoff frequency must be greater than zero to plot the response.'),
    ).toBeInTheDocument();
  });

  it('computes cutoff frequency from resistance and capacitance', () => {
    render(<FrequencyResponseChart mode="lowpass" rOhms={10_000} cFarads={47e-9} pointCount={16} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(capturedReferenceLineProps?.x).toBeCloseTo(338.63, 2);
  });

  it('renders chart data when cutoff is provided directly', () => {
    render(<FrequencyResponseChart mode="lowpass" fcHz={1_000} pointCount={8} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(capturedLineChartProps.dataset).toHaveLength(8);
    expect(capturedLineChartProps.series[0].dataKey).toBe('magnitudeDb');

    const formatted = capturedLineChartProps.series[0].valueFormatter(
      capturedLineChartProps.dataset[0].magnitudeDb,
      { dataIndex: 0 },
    );
    expect(formatted).toMatch(/\|H\|/);
    expect(capturedReferenceLineProps?.x).toBeCloseTo(1_000, 6);
  });

  it('updates the chart when props change', () => {
    const { rerender } = render(
      <FrequencyResponseChart mode="lowpass" fcHz={1_000} pointCount={5} />,
    );
    const initialFrequencies = capturedLineChartProps.dataset.map((point: any) => point.frequency);

    rerender(<FrequencyResponseChart mode="lowpass" fcHz={2_000} pointCount={5} />);

    const nextFrequencies = capturedLineChartProps.dataset.map((point: any) => point.frequency);
    expect(nextFrequencies[0]).not.toBe(initialFrequencies[0]);
    expect(capturedReferenceLineProps?.x).toBeCloseTo(2_000, 6);
  });

  it('formats tooltips with both magnitude and decibel values when showDb is false', () => {
    render(<FrequencyResponseChart mode="highpass" fcHz={5_000} pointCount={4} showDb={false} />);

    const formatted = capturedLineChartProps.series[0].valueFormatter(
      capturedLineChartProps.dataset[0].magnitude,
      { dataIndex: 0 },
    );
    expect(formatted).toMatch(/dB/);
    expect(capturedLineChartProps.series[0].dataKey).toBe('magnitude');
  });
});

