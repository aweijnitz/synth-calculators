import { render, screen } from '@testing-library/react';
import * as React from 'react';
import SkMultiResponse from '../../components/charts/SkMultiResponse';

let capturedLineChartProps: any;
let capturedReferenceLines: any[];

jest.mock('@mui/x-charts/LineChart', () => ({
  LineChart: (props: any) => {
    capturedLineChartProps = props;
    return <div data-testid="line-chart">{props.children}</div>;
  },
}));

jest.mock('@mui/x-charts/ChartsReferenceLine', () => ({
  ChartsReferenceLine: (props: any) => {
    capturedReferenceLines.push(props);
    return <div data-testid="reference-line" data-label={props.label} data-x={props.x} />;
  },
}));

describe('SkMultiResponse', () => {
  beforeEach(() => {
    capturedLineChartProps = undefined;
    capturedReferenceLines = [];
  });

  it('renders an informational state when no series provided', () => {
    render(<SkMultiResponse series={[]} />);

    expect(
      screen.getByText('Provide valid component values to preview the sweep.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders a skeleton when loading', () => {
    render(<SkMultiResponse series={[]} loading />);

    expect(screen.getByTestId('frequency-response-skeleton')).toBeInTheDocument();
  });

  it('plots five series with reference lines and formatted tooltips', () => {
    render(
      <SkMultiResponse
        series={[
          { label: '0%', fc: 12_000 },
          { label: '25%', fc: 6_000 },
          { label: '50%', fc: 3_000 },
          { label: '75%', fc: 1_500 },
          { label: '100%', fc: 750 },
        ]}
        pointCount={16}
      />,
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(capturedLineChartProps.series).toHaveLength(5);
    const firstSeries = capturedLineChartProps.series[0];
    expect(firstSeries.label).toBe('0%');
    const formatted = firstSeries.valueFormatter(firstSeries.data[0], { dataIndex: 0 });
    expect(formatted).toMatch(/\|H\|/);
    expect(capturedReferenceLines).toHaveLength(5);
    expect(capturedReferenceLines.map((line) => line.label)).toEqual([
      '0%',
      '25%',
      '50%',
      '75%',
      '100%',
    ]);
  });

  it('honors linear magnitude mode with non-negative y-axis', () => {
    render(
      <SkMultiResponse
        series={[
          { label: '0%', fc: 5_000 },
          { label: '25%', fc: 2_500 },
        ]}
        showDb={false}
        pointCount={8}
      />,
    );

    expect(capturedLineChartProps.yAxis[0].min).toBe(0);
    const formatted = capturedLineChartProps.series[0].valueFormatter(
      capturedLineChartProps.series[0].data[0],
      { dataIndex: 0 },
    );
    expect(formatted).toMatch(/dB/);
  });
});
