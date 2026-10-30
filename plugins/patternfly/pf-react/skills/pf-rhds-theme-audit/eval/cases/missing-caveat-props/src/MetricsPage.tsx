import { PageSection } from '@patternfly/react-core';
import { Chart } from '@patternfly/react-charts/echarts';

const chartData = {
  series: [
    { name: 'Requests', data: [120, 200, 150, 80, 70, 110, 130] },
  ],
  xAxis: { data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
};

export function MetricsPage() {
  return (
    <PageSection>
      <Chart
        option={{
          xAxis: { type: 'category', data: chartData.xAxis.data },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: chartData.series[0].data }],
        }}
        height="300px"
      />
    </PageSection>
  );
}
