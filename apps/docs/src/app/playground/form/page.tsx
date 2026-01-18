"use client";

import { FormProvider, useFormContext } from "@jlnstack/form/react";
import { useState } from "react";

const steps = ["Welcome", "Preferences", "Account"];

export default function FormPlayground() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<{
    theme?: string;
    name?: string;
    email?: string;
  }>({});

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = () => {
    alert(`Submitted:\n${JSON.stringify(formData, null, 2)}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-lg mx-auto">
        <FormProvider>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index === currentStep
                          ? "bg-neutral-100 text-neutral-900"
                          : index < currentStep
                            ? "bg-neutral-700 text-neutral-300"
                            : "bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-sm ${
                        index === currentStep
                          ? "text-neutral-100"
                          : "text-neutral-500"
                      }`}
                    >
                      {step}
                    </span>
                    {index < steps.length - 1 && (
                      <div className="w-8 h-px bg-neutral-800" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[280px]">
              {currentStep === 0 && <WelcomeStep />}
              {currentStep === 1 && (
                <PreferencesStep
                  value={formData.theme}
                  onChange={(theme) => setFormData((d) => ({ ...d, theme }))}
                />
              )}
              {currentStep === 2 && (
                <AccountStep
                  data={formData}
                  onChange={(data) => setFormData((d) => ({ ...d, ...data }))}
                  onSubmit={handleSubmit}
                />
              )}
            </div>

            {/* Footer */}
            <StepperFooter
              currentStep={currentStep}
              totalSteps={steps.length}
              onBack={handleBack}
              onNext={handleNext}
            />
          </div>
        </FormProvider>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Welcome</h2>
      <p className="text-neutral-400 text-sm leading-relaxed">
        This example demonstrates a multi-step form where only the final step
        registers a form. The footer automatically detects when a form is
        registered and changes the &quot;Next&quot; button to
        &quot;Submit&quot;.
      </p>
      <p className="text-neutral-400 text-sm leading-relaxed">
        Click Next to continue through the steps.
      </p>
    </div>
  );
}

function PreferencesStep({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Preferences</h2>
      <p className="text-neutral-400 text-sm">Select your preferred theme.</p>
      <div className="grid grid-cols-2 gap-3">
        {["Light", "Dark", "System", "Custom"].map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => onChange(theme.toLowerCase())}
            className={`p-4 rounded-lg border text-sm font-medium transition-colors ${
              value === theme.toLowerCase()
                ? "border-neutral-100 bg-neutral-800"
                : "border-neutral-800 hover:border-neutral-700"
            }`}
          >
            {theme}
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountStep({
  data,
  onChange,
  onSubmit,
}: {
  data: { name?: string; email?: string };
  onChange: (data: { name?: string; email?: string }) => void;
  onSubmit: () => void;
}) {
  const { registerForm } = useFormContext();

  const formProps = registerForm(() => {
    onSubmit();
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Account Details</h2>
      <p className="text-neutral-400 text-sm">
        Enter your account information to complete setup.
      </p>
      <form
        {...formProps}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-neutral-300">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={data.name || ""}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-neutral-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={data.email || ""}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="john@example.com"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>
      </form>
    </div>
  );
}

function StepperFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
}: {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { isFormRegistered, formId } = useFormContext();

  const isLastStep = currentStep === totalSteps - 1;
  const showSubmit = isLastStep && isFormRegistered;

  return (
    <div className="px-6 py-4 border-t border-neutral-800 flex justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0}
        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800"
      >
        Back
      </button>

      {showSubmit ? (
        <button
          type="submit"
          form={formId}
          className="px-4 py-2 text-sm font-medium bg-neutral-100 text-neutral-900 rounded-lg transition-colors hover:bg-white"
        >
          Submit
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={isLastStep}
          className="px-4 py-2 text-sm font-medium bg-neutral-100 text-neutral-900 rounded-lg transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      )}
    </div>
  );
}
