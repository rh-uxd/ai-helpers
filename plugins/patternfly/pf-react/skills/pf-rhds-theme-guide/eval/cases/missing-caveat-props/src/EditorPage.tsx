import { PageSection } from '@patternfly/react-core';
import { CodeEditor } from '@patternfly/react-code-editor';

const sampleCode = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;

export function EditorPage() {
  return (
    <PageSection>
      <CodeEditor
        code={sampleCode}
        language="typescript"
        height="400px"
      />
    </PageSection>
  );
}
