import React, { useState } from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  ActionGroup,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';

interface LoginFormProps {
  onSubmit: (username: string, password: string) => void;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validated, setValidated] = useState<ValidatedOptions>(ValidatedOptions.default);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setValidated(ValidatedOptions.error);
      return;
    }
    setValidated(ValidatedOptions.default);
    onSubmit(username, password);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup label="Username" isRequired fieldId="username">
        <TextInput
          isRequired
          id="username"
          value={username}
          onChange={(_event, val) => setUsername(val)}
          validated={!username && validated === ValidatedOptions.error ? ValidatedOptions.error : ValidatedOptions.default}
        />
        {!username && validated === ValidatedOptions.error && (
          <HelperText>
            <HelperTextItem variant="error">Username is required</HelperTextItem>
          </HelperText>
        )}
      </FormGroup>
      <FormGroup label="Password" isRequired fieldId="password">
        <TextInput
          isRequired
          type="password"
          id="password"
          value={password}
          onChange={(_event, val) => setPassword(val)}
          validated={!password && validated === ValidatedOptions.error ? ValidatedOptions.error : ValidatedOptions.default}
        />
        {!password && validated === ValidatedOptions.error && (
          <HelperText>
            <HelperTextItem variant="error">Password is required</HelperTextItem>
          </HelperText>
        )}
      </FormGroup>
      {error && (
        <HelperText>
          <HelperTextItem variant="error">{error}</HelperTextItem>
        </HelperText>
      )}
      <ActionGroup>
        <Button type="submit" variant="primary">
          Log in
        </Button>
      </ActionGroup>
    </Form>
  );
};
