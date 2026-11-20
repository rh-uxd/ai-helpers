import { Flex, FlexItem, Title, Content } from '@patternfly/react-core';

export function StatBlock({ value, label, help, isColumn }: Props) {
  return (
    <Flex direction={{ default: isColumn ? 'column' : 'row' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Title headingLevel="h4" size="3xl">{value}</Title>
      </FlexItem>
      <FlexItem>
        <Content component="small">{label}</Content>
      </FlexItem>
      <FlexItem>{help}</FlexItem>
    </Flex>
  );
}
