import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '@patternfly/react-core';
import '@patternfly/react-core/dist/styles/base.css';
import './fixtures.css';

const params = new URLSearchParams(location.search);
const provider = params.get('provider') || 'native';
const variant = params.get('variant') || 'valid';

function Native() {
  const open = () => {
    const dialog = document.querySelector('dialog');
    // Deliberately nonmodal in the wrong-modality fixture.
    if (variant === 'wrong-modality') dialog.show();
    else dialog.showModal();
  };
  return <>
    <button id="open" onClick={open}>Review changes</button>
    <button id="background">Background action</button>
    <dialog aria-labelledby={variant === 'unnamed' ? undefined : 'title'}>
      <h2 id="title">Review changes</h2>
      <p id="intro" tabIndex={-1} autoFocus>Read these changes before continuing.</p>
      <ul><li>Display name changes.</li><li>Notifications stay enabled.</li></ul>
      <form method="dialog"><button id="cancel">Cancel</button><button id="confirm">Confirm</button></form>
    </dialog>
  </>;
}

function PatternFly() {
  const [open, setOpen] = useState(false);
  return <>
    <Button id="open" onClick={() => setOpen(true)}>Review changes</Button>
    <Button id="background">Background action</Button>
    <Modal isOpen={open} onClose={() => setOpen(false)}
      aria-labelledby={variant === 'unnamed' ? undefined : variant === 'broken-name' ? 'missing-title' : 'title'}
      elementToFocus="#intro" disableFocusTrap={variant === 'no-trap'}>
      <ModalHeader title="Review changes" labelId="title" />
      <ModalBody>
        <p id="intro" tabIndex={-1}>Read these changes before continuing.</p>
        <ul><li>Display name changes.</li><li>Notifications stay enabled.</li></ul>
      </ModalBody>
      <ModalFooter>
        <Button id="cancel" variant="link" onClick={() => setOpen(false)}>Cancel</Button>
        <Button id="confirm" onClick={() => setOpen(false)}>Confirm</Button>
      </ModalFooter>
    </Modal>
  </>;
}

function Custom() {
  const [open, setOpen] = useState(false);
  // Intentionally broken: semantics claim modality without focus/background management.
  return <>
    <button id="open" onClick={() => setOpen(true)}>Review changes</button>
    <button id="background">Background action</button>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="title">
      <h2 id="title">Review changes</h2>
      <button id="cancel" onClick={() => setOpen(false)}>Cancel</button>
    </div>}
  </>;
}

createRoot(document.getElementById('root')).render(<main>
  <h1>Modal review fixtures</h1>
  {provider === 'pf' ? <PatternFly /> : provider === 'custom' ? <Custom /> : <Native />}
</main>);
