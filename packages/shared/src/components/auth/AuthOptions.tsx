import React, {
  MutableRefObject,
  ReactElement,
  useContext,
  useState,
} from 'react';
import classNames from 'classnames';
import { getQueryParams } from '../../contexts/AuthContext';
import FeaturesContext from '../../contexts/FeaturesContext';
import { AuthVersion } from '../../lib/featureValues';
import { CloseModalFunc } from '../modals/common';
import TabContainer, { Tab } from '../tabs/TabContainer';
import AuthDefault from './AuthDefault';
import { AuthSignBack } from './AuthSignBack';
import ForgotPasswordForm from './ForgotPasswordForm';
import LoginForm from './LoginForm';
import {
  RegistrationForm,
  RegistrationFormValues,
  SocialProviderAccount,
} from './RegistrationForm';
import { getNodeValue } from '../../lib/auth';
import useWindowEvents from '../../hooks/useWindowEvents';
import useRegistration from '../../hooks/useRegistration';
import EmailVerificationSent from './EmailVerificationSent';
import AuthModalHeader from './AuthModalHeader';
import { AuthFlow, getKratosFlow } from '../../lib/kratos';
import { fallbackImages } from '../../lib/config';

export enum Display {
  Default = 'default',
  Registration = 'registration',
  SignBack = 'sign_back',
  ForgotPassword = 'forgot_password',
  EmailSent = 'email_sent',
}

const hasLoggedOut = () => {
  const params = getQueryParams();

  return params?.logged_out !== undefined;
};

interface AuthOptionsProps {
  onClose?: CloseModalFunc;
  onSelectedProvider: (account: SocialProviderAccount) => void;
  formRef: MutableRefObject<HTMLFormElement>;
  socialAccount?: SocialProviderAccount;
  defaultDisplay?: Display;
  className?: string;
}

function AuthOptions({
  onClose,
  onSelectedProvider,
  className,
  formRef,
  socialAccount,
  defaultDisplay = Display.Default,
}: AuthOptionsProps): ReactElement {
  const { authVersion } = useContext(FeaturesContext);
  const isV2 = authVersion === AuthVersion.V2;
  const [email, setEmail] = useState('');
  const [activeDisplay, setActiveDisplay] = useState(
    hasLoggedOut() ? Display.SignBack : defaultDisplay,
  );
  const { validateRegistration, onSocialRegistration } = useRegistration({
    key: 'registration_form',
    onValidRegistration: () => setActiveDisplay(Display.EmailSent), // on valid registration get boot
    onRedirect: (redirect) => window.open(redirect),
  });

  useWindowEvents('message', async (e) => {
    if (e.data?.flow) {
      const flow = await getKratosFlow(AuthFlow.Registration, e.data.flow);
      const { nodes, action } = flow.ui;
      onSelectedProvider({
        action,
        provider: getNodeValue('provider', nodes),
        csrf_token: getNodeValue('csrf_token', nodes),
        email: getNodeValue('traits.email', nodes),
        name: getNodeValue('traits.name', nodes),
        username: getNodeValue('traits.username', nodes),
        image: getNodeValue('traits.image', nodes) || fallbackImages.avatar,
      });
      setActiveDisplay(Display.Registration);
    }
  });

  const onEmailRegistration = async (emailAd: string) => {
    // before displaying registration, ensure the email doesn't exists
    setActiveDisplay(Display.Registration);
    setEmail(emailAd);
  };

  const onRegister = (params: RegistrationFormValues) => {
    validateRegistration({
      ...params,
      provider: socialAccount?.provider,
      method: socialAccount ? 'oidc' : 'password',
    });
  };

  return (
    <div
      className={classNames(
        'flex overflow-y-auto z-1 flex-col w-full rounded-16 bg-theme-bg-tertiary',
        !isV2 && 'max-w-[25.75rem]',
        className,
      )}
    >
      <TabContainer<Display>
        onActiveChange={(active) => setActiveDisplay(active)}
        controlledActive={activeDisplay}
        showHeader={false}
      >
        <Tab label={Display.Default}>
          <AuthDefault
            onClose={onClose}
            onSignup={onEmailRegistration}
            onProviderClick={onSocialRegistration}
            onForgotPassword={() => setActiveDisplay(Display.ForgotPassword)}
            isV2={isV2}
          />
        </Tab>
        <Tab label={Display.Registration}>
          <RegistrationForm
            onBack={() => setActiveDisplay(defaultDisplay)}
            formRef={formRef}
            email={email}
            socialAccount={socialAccount}
            onClose={onClose}
            isV2={isV2}
            onSignup={onRegister}
          />
        </Tab>
        <Tab label={Display.SignBack}>
          <AuthSignBack>
            <LoginForm
              onSuccessfulLogin={(e) => onClose(e)}
              onForgotPassword={() => setActiveDisplay(Display.ForgotPassword)}
            />
          </AuthSignBack>
        </Tab>
        <Tab label={Display.ForgotPassword}>
          <ForgotPasswordForm
            email={email}
            onClose={onClose}
            onBack={() => setActiveDisplay(defaultDisplay)}
          />
        </Tab>
        <Tab label={Display.EmailSent}>
          <AuthModalHeader
            title="Verify your email address"
            onClose={onClose}
          />
          <EmailVerificationSent email={email} />
        </Tab>
      </TabContainer>
    </div>
  );
}

export default AuthOptions;
