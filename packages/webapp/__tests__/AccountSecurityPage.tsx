import React from 'react';
import { LoggedUser } from '@dailydotdev/shared/src/lib/user';
import loggedUser from '@dailydotdev/shared/__tests__/fixture/loggedUser';
import {
  loginVerificationMockData,
  mockKratosPost,
  mockListProviders,
  mockLoginReverifyFlow,
  mockSettingsFlow,
  mockSettingsValidation,
  mockWhoAmIFlow,
  requireVerificationSettingsMock,
  settingsFlowMockData,
  socialProviderRedirectMock,
  verifiedLoginData,
} from '@dailydotdev/shared/__tests__/fixture/auth';
import {
  fireEvent,
  render,
  RenderResult,
  screen,
} from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { waitForNock } from '@dailydotdev/shared/__tests__/helpers/utilities';
import { AuthContextProvider } from '@dailydotdev/shared/src/contexts/AuthContext';
import { getNodeValue } from '@dailydotdev/shared/src/lib/auth';
import { QueryClient, QueryClientProvider } from 'react-query';
import SecurityProfilePage from '../pages/account/security';

jest.mock('next/router', () => ({
  useRouter() {
    return {
      isFallback: false,
    };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const defaultLoggedUser: LoggedUser = {
  ...loggedUser,
  twitter: 'dailydotdev',
  github: 'dailydotdev',
  hashnode: 'dailydotdev',
  portfolio: 'https://daily.dev/?key=vaue',
  acceptedMarketing: true,
};

const updateUser = jest.fn();
const refetchBoot = jest.fn();

const renderComponent = (): RenderResult => {
  const client = new QueryClient();
  mockSettingsFlow();
  mockListProviders();
  mockWhoAmIFlow();

  return render(
    <QueryClientProvider client={client}>
      <AuthContextProvider
        refetchBoot={refetchBoot}
        user={defaultLoggedUser}
        updateUser={updateUser}
        getRedirectUri={jest.fn()}
        tokenRefreshed
      >
        <SecurityProfilePage />
      </AuthContextProvider>
    </QueryClientProvider>,
  );
};

const verifySession = async (email = defaultLoggedUser.email) => {
  mockLoginReverifyFlow();
  const text = await screen.findByText("Verify it's you (security check)");
  expect(text).toBeInTheDocument();
  await waitForNock();
  fireEvent.input(screen.getByTestId('login_email'), {
    target: { value: email },
  });
  fireEvent.input(screen.getByTestId('login_password'), {
    target: { value: '#123xAbc' },
  });
  const { action, nodes: loginNodes } = loginVerificationMockData.ui;
  const loginToken = getNodeValue('csrf_token', loginNodes);
  const params = {
    csrf_token: loginToken,
    identifier: email,
    password: '#123xAbc',
    method: 'password',
  };
  mockKratosPost({ action, params }, verifiedLoginData);
  await act(async () => {
    const submitLogin = await screen.findByText('Login');
    fireEvent.click(submitLogin);
    await waitForNock();
    expect(refetchBoot).toHaveBeenCalled();
  });
  return true;
};

it('should show current email', async () => {
  renderComponent();
  const el = await screen.findByTestId('current_email');
  expect(el).toHaveValue(defaultLoggedUser.email);
});

it('should allow changing of email', async () => {
  renderComponent();
  await waitForNock();
  const el = await screen.findByTestId('current_email');
  expect(el).toHaveValue(defaultLoggedUser.email);
  const displayForm = await screen.findByText('Change email');
  fireEvent.click(displayForm);
  const email = 'sample@email.com';
  fireEvent.input(screen.getByPlaceholderText('Email'), {
    target: { value: email },
  });
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = {
    csrf_token: token,
    method: 'profile',
    'traits.email': email,
    'traits.name': getNodeValue('traits.name', nodes),
    'traits.username': getNodeValue('traits.username', nodes),
    'traits.image': getNodeValue('traits.image', nodes),
  };
  mockSettingsValidation(params);
  const submitChanges = await screen.findByText('Save changes');
  fireEvent.click(submitChanges);
  await waitForNock();
  const sent = await screen.findByTestId('email_verification_sent');
  expect(sent).toBeInTheDocument();
});

it('should allow changing of email but require verification', async () => {
  renderComponent();
  await waitForNock();
  const el = await screen.findByTestId('current_email');
  expect(el).toHaveValue(defaultLoggedUser.email);
  const displayForm = await screen.findByText('Change email');
  fireEvent.click(displayForm);
  const email = 'sample@email.com';
  fireEvent.input(screen.getByPlaceholderText('Email'), {
    target: { value: email },
  });
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = {
    csrf_token: token,
    method: 'profile',
    'traits.email': email,
    'traits.name': getNodeValue('traits.name', nodes),
    'traits.username': getNodeValue('traits.username', nodes),
    'traits.image': getNodeValue('traits.image', nodes),
  };
  mockSettingsValidation(params, requireVerificationSettingsMock, 403);
  const submitChanges = await screen.findByText('Save changes');
  fireEvent.click(submitChanges);
  await waitForNock();
  await verifySession();
  mockSettingsValidation(params);
  const reSubmitChanges = await screen.findByText('Save changes');
  fireEvent.click(reSubmitChanges);
  await waitForNock();
  const sent = await screen.findByTestId('email_verification_sent');
  expect(sent).toBeInTheDocument();
});

it('should allow setting new password', async () => {
  renderComponent();
  await waitForNock();
  const password = '#123xAbc';
  fireEvent.input(screen.getByPlaceholderText('Password'), {
    target: { value: password },
  });
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = {
    csrf_token: token,
    method: 'password',
    password,
  };
  mockSettingsValidation(params);
  const submitResetPassword = await screen.findByText('Set password');
  fireEvent.click(submitResetPassword);
  await waitForNock();
  const input = await screen.findByPlaceholderText('Password');
  expect(input).toHaveValue('');
});

it('should allow setting new password but require to verify session', async () => {
  renderComponent();
  await waitForNock();
  const password = '#123xAbc';
  fireEvent.input(screen.getByPlaceholderText('Password'), {
    target: { value: password },
  });
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = {
    csrf_token: token,
    method: 'password',
    password,
  };
  mockSettingsValidation(params, requireVerificationSettingsMock, 403);
  const submitResetPassword = await screen.findByText('Set password');
  fireEvent.click(submitResetPassword);
  await waitForNock();
  await verifySession();
  mockSettingsValidation(params);
  const reSubmitResetPassword = await screen.findByText('Set password');
  fireEvent.click(reSubmitResetPassword);
  await waitForNock();
  const input = await screen.findByPlaceholderText('Password');
  expect(input).toHaveValue('');
});

it('should allow linking social providers', async () => {
  renderComponent();
  await waitForNock();
  const connect = await screen.findByText('Connect with Google');
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = { link: 'google', csrf_token: token };
  mockSettingsValidation(params);
  fireEvent.click(connect);
  await waitForNock();
});

it('should allow linking social providers but require to verify session', async () => {
  renderComponent();
  await waitForNock();
  const connect = await screen.findByText('Connect with Google');
  const { nodes } = settingsFlowMockData.ui;
  const token = getNodeValue('csrf_token', nodes);
  const params = { link: 'google', csrf_token: token };
  mockSettingsValidation(params, requireVerificationSettingsMock, 403);
  fireEvent.click(connect);
  await waitForNock();
  await verifySession();
  mockSettingsValidation(params, socialProviderRedirectMock, 422);
  const reConnect = await screen.findByText('Connect with Google');
  fireEvent.click(reConnect);
  await waitForNock();
});
