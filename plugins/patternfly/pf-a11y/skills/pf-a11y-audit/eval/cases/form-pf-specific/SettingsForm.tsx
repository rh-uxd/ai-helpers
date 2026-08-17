import React, { useState } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  TextArea,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  ActionGroup,
  Button,
} from "@patternfly/react-core";

const SettingsForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState(false);

  const validate = () => {
    if (!name) setNameError(true);
  };

  return (
    <Form>
      <FormGroup>
        <TextInput id="settings-name" value={name} onChange={(_e, v) => setName(v)} />
        {nameError && (
          <HelperText>
            <HelperTextItem>Name is required</HelperTextItem>
          </HelperText>
        )}
      </FormGroup>

      <FormGroup label="Email" fieldId="settings-email">
        <TextInput id="settings-email" value={email} onChange={(_e, v) => setEmail(v)} />
      </FormGroup>

      <FormGroup label="Role">
        <FormSelect id="settings-role">
          <FormSelectOption value="admin" label="Admin" />
          <FormSelectOption value="viewer" label="Viewer" />
        </FormSelect>
      </FormGroup>

      <FormGroup label="Notes" fieldId="settings-notes">
        <TextArea id="settings-notes" />
        <HelperText>
          <HelperTextItem style={{ color: "red" }}>
            Notes exceed maximum length
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      <ActionGroup>
        <Button variant="primary" onClick={validate}>Save</Button>
        <Button variant="link">Cancel</Button>
      </ActionGroup>
    </Form>
  );
};

export default SettingsForm;
