import classNames from 'classnames';
import React, { ReactElement } from 'react';
import { getNodeValue } from '../../lib/auth';
import { Button } from '../buttons/Button';
import { TextField } from '../fields/TextField';
import MailIcon from '../icons/Mail';
import VIcon from '../icons/V';
import { CloseModalFunc } from '../modals/common';
import AuthModalHeader from './AuthModalHeader';
import { AuthForm, AuthModalText } from './common';
import TokenInput from './TokenField';
import useAccountRecovery from '../../hooks/useAccountRecovery';

interface ForgotPasswordFormProps {
  initialEmail?: string;
  onBack?: CloseModalFunc;
  onClose?: CloseModalFunc;
}

function ForgotPasswordForm({
  initialEmail,
  onBack,
  onClose,
}: ForgotPasswordFormProps): ReactElement {
  const {
    timer,
    isSendingEmail,
    isEmailSent,
    onUpdateHint,
    onSendRecovery: onSendEmail,
    recovery,
    errorHint: hint,
  } = useAccountRecovery();

  return (
    <>
      <AuthModalHeader
        title="Forgot password"
        onBack={onBack}
        onClose={onClose}
      />
      <AuthForm
        className="flex flex-col items-end py-8 px-14"
        onSubmit={onSendEmail}
        data-testid="recovery_form"
      >
        <TokenInput token={getNodeValue('csrf_token', recovery?.ui?.nodes)} />
        <AuthModalText className="text-center">
          Enter the email address you registered with and we will send you a
          password reset link.
        </AuthModalText>
        <TextField
          className="mt-6 w-full"
          name="email"
          type="email"
          inputId="email"
          label="Email"
          defaultValue={initialEmail}
          hint={hint}
          valid={!hint}
          onChange={() => hint && onUpdateHint(null)}
          leftIcon={<MailIcon />}
          rightIcon={
            isEmailSent && (
              <VIcon
                className="text-theme-color-avocado"
                data-testid="email_sent_icon"
              />
            )
          }
        />
        <Button
          className={classNames(
            'mt-6',
            isEmailSent ? 'btn-primary' : 'bg-theme-color-cabbage',
          )}
          type="submit"
          disabled={isEmailSent || isSendingEmail}
        >
          {timer === 0 ? 'Send email' : `${timer}s`}
        </Button>
      </AuthForm>
    </>
  );
}

export default ForgotPasswordForm;
