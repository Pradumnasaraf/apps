import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import {
  getNodeByKey,
  getErrorMessage,
  ValidateRecoveryParams,
  AccountRecoveryParameters,
  getNodeValue,
} from '../lib/auth';
import { formToJson } from '../lib/form';
import { disabledRefetch } from '../lib/func';
import {
  AuthFlow,
  InitializationData,
  initializeKratosFlow,
  submitKratosFlow,
} from '../lib/kratos';
import useTimer from './useTimer';

interface UseAccountRecovery {
  errorHint?: string;
  onUpdateHint?: (value: string | null) => void;
  recovery?: InitializationData;
  timer?: number;
  isSendingEmail?: boolean;
  isEmailSent?: boolean;
  onSendRecovery: (e: FormEvent) => Promise<void>;
}

const useAccountRecovery = (): UseAccountRecovery => {
  const [hint, setHint] = useState<string>(null);
  const [sentCount, setSentCount] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const { timer, setTimer, runTimer } = useTimer(() => setEmailSent(false), 0);
  const { data: recovery } = useQuery(
    ['recovery', sentCount],
    () => initializeKratosFlow(AuthFlow.Recovery),
    { ...disabledRefetch },
  );

  const { mutateAsync: sendEmail, isLoading } = useMutation(
    (params: ValidateRecoveryParams) => submitKratosFlow(params),
    {
      onSuccess: ({ error }) => {
        if (error) {
          const requestError = getErrorMessage(error.ui.messages);
          const emailError = getNodeByKey('email', error.ui.nodes);
          const formError = getErrorMessage(emailError?.messages);
          const message = requestError || formError;
          return setHint(message);
        }

        setTimer(60);
        runTimer();
        setSentCount((value) => value + 1);
        return setEmailSent(true);
      },
    },
  );

  const onSendEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { email } = formToJson(e.currentTarget);
    const { action, nodes } = recovery.ui;
    const csrfToken = getNodeValue('csrf_token', nodes);
    const params: AccountRecoveryParameters = {
      csrf_token: csrfToken,
      email,
      method: 'link',
    };

    await sendEmail({ action, params });
  };

  return useMemo(
    () => ({
      onUpdateHint: setHint,
      errorHint: hint,
      timer,
      recovery,
      isEmailSent: emailSent,
      isSendingEmail: isLoading,
      onSendRecovery: onSendEmail,
    }),
    [hint, timer, emailSent, isLoading],
  );
};

export default useAccountRecovery;
