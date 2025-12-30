"use client";

import { createModalRegistry, modal } from "@jlnstack/modal";
import {
  ModalClient,
  ModalClientProvider,
  ModalOutlet,
  useModal,
} from "@jlnstack/modal/react";

import { useState } from "react";

const modalClient = new ModalClient();

const LoginModal = ({
  email,
  onSuccess,
  onClose,
}: {
  email: string;
  onSuccess: (token: string) => void;
  onClose: () => void;
}) => {
  const modal = useModal(modals.auth.login.modalOptions());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <p className="mb-4 text-gray-600">Email: {email}</p>
        <button onClick={onClose}>Close</button>
        <button
          type="button"
          onClick={() => {
            modal.resolve({ token: "resolved-token" });
            onSuccess("abc123-token");
          }}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Login
        </button>
      </div>
    </div>
  );
};

const login = modal.output<{ token: string }>().create(LoginModal);

const modals = createModalRegistry({
  auth: createModalRegistry({
    login,
  }),
});

function ExampleContent() {
  const [loginResult, setLoginResult] = useState<string | null>(null);

  const loginModal = useModal(modals.auth.login.modalOptions());

  const handleLogin = async () => {
    const result = await loginModal.openAsync({
      email: "foo@bar.com",
      onSuccess: () => {
        console.log("success");
      },
      onClose: () => {
        console.log("close");
      },
    });

    console.log("result", result);
  };

  return (
    <div className="min-h-screen p-8 bg-black">
      {loginModal.isOpen && <p>Login Modal is open</p>}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Modal Example</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Login Modal</h2>
          <p className="text-gray-600 mb-4">
            Opens a login modal that returns a token. Result:{" "}
            {loginResult ? (
              <span className="font-mono text-green-600">{loginResult}</span>
            ) : (
              <span className="text-gray-400">none</span>
            )}
          </p>
          <button
            type="button"
            onClick={handleLogin}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Open Login Modal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModalExamplePage() {
  return (
    <ModalClientProvider client={modalClient}>
      <ExampleContent />
      <ModalOutlet />
    </ModalClientProvider>
  );
}
