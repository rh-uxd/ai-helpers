import { useEffect, useState } from 'react';
import { Hero } from '@patternfly/react-core';
import { CodeEditor } from '@patternfly/react-code-editor';
import { Chart } from '@patternfly/react-charts/echarts';
import '@rhds/elements/rh-card/rh-card.js';

export default function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('pf-v6-theme-dark', isDark);
  }, [isDark]);

  return (
    <>
      <button type="button" onClick={() => setIsDark((dark) => !dark)}>Toggle theme</button>
      <Hero
        backgroundSrcLight="/images/hero-light.png"
        backgroundSrcDark="/images/hero-dark.png"
      >
        <h1>Operations</h1>
      </Hero>
      <CodeEditor isDarkTheme={isDark} code="const ready = true;" language="javascript" />
      <Chart nodeSelector="html" option={{ series: [] }} />
      <rh-card color-palette="dark">
        <h2 slot="header">Always dark status</h2>
      </rh-card>
    </>
  );
}
