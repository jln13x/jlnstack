import { describe, expect, it, vi } from "vitest";
import { modal } from "./builder";
import type { TemplateContext } from "./types";

describe("template", () => {
  it("should wrap modal content with template", () => {
    const wrapper = vi.fn(
      (ctx: TemplateContext<undefined, { className: string }>) => ({
        type: "wrapper",
        content: ctx.modal,
        props: ctx.props,
      }),
    );

    const templatedModal = modal
      .template<{ className: string }>(wrapper)
      .input<{ title: string }>()
      .create(
        (input) => ({ type: "content", title: input.title }),
        { defaultValues: { template: { className: "dialog" } } },
      );

    const result = templatedModal._def.component(
      { title: "Hello" },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(wrapper).toHaveBeenCalledOnce();
    expect(result).toEqual({
      type: "wrapper",
      content: { type: "content", title: "Hello" },
      props: { className: "dialog" },
    });
  });

  it("should not wrap when no template is used", () => {
    const regularModal = modal
      .input<{ title: string }>()
      .create((input) => ({ type: "content", title: input.title }));

    const result = regularModal._def.component(
      { title: "Hello" },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(result).toEqual({ type: "content", title: "Hello" });
  });

  it("should pass close and resolve to template wrapper", () => {
    const closeFn = vi.fn();
    const resolveFn = vi.fn();
    let capturedClose: (() => void) | null = null;
    let capturedResolve: ((value: boolean) => void) | null = null;

    const templatedModal = modal
      .template<{}>((ctx) => {
        capturedClose = ctx.close;
        capturedResolve = ctx.resolve as unknown as (value: boolean) => void;
        return ctx.modal;
      })
      .output<boolean>()
      .create(() => "content");

    templatedModal._def.component({}, { close: closeFn, resolve: resolveFn });

    expect(capturedClose).not.toBeNull();
    capturedClose!();
    expect(closeFn).toHaveBeenCalledOnce();

    expect(capturedResolve).not.toBeNull();
    capturedResolve!(true);
    expect(resolveFn).toHaveBeenCalledWith(true);
  });

  it("should chain template with input and output", () => {
    const templatedModal = modal
      .template<{ theme: string }>((ctx) => ({
        wrapper: true,
        theme: ctx.props.theme,
        content: ctx.modal,
      }))
      .input<{ name: string }>()
      .output<number>()
      .create(
        (input) => ({ greeting: `Hello ${input.name}` }),
        { defaultValues: { template: { theme: "dark" } } },
      );

    const result = templatedModal._def.component(
      { name: "World" },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(result).toEqual({
      wrapper: true,
      theme: "dark",
      content: { greeting: "Hello World" },
    });
  });
});

describe("defaultValues", () => {
  it("should merge modal input defaults", () => {
    const modalWithDefaults = modal
      .input<{ title: string; message: string }>()
      .create(
        (input) => input,
        { defaultValues: { modal: { title: "Default Title" } } },
      );

    // At runtime, defaults are merged so we can pass partial input
    // Type system doesn't know this, so we cast for the test
    const result = modalWithDefaults._def.component(
      { message: "Hello" } as { title: string; message: string },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(result).toEqual({ title: "Default Title", message: "Hello" });
  });

  it("should allow overriding default values", () => {
    const modalWithDefaults = modal
      .input<{ title: string; message: string }>()
      .create(
        (input) => input,
        { defaultValues: { modal: { title: "Default Title" } } },
      );

    const result = modalWithDefaults._def.component(
      { title: "Custom Title", message: "Hello" },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(result).toEqual({ title: "Custom Title", message: "Hello" });
  });

  it("should merge both template and modal defaults", () => {
    const templatedModal = modal
      .template<{ className: string }>((ctx) => ({
        className: ctx.props.className,
        content: ctx.modal,
      }))
      .input<{ title: string; message: string }>()
      .create(
        (input) => input,
        {
          defaultValues: {
            template: { className: "dialog" },
            modal: { title: "Alert" },
          },
        },
      );

    // At runtime, defaults are merged so we can pass partial input
    const result = templatedModal._def.component(
      { message: "Something happened" } as { title: string; message: string },
      { close: vi.fn(), resolve: vi.fn() },
    );

    expect(result).toEqual({
      className: "dialog",
      content: { title: "Alert", message: "Something happened" },
    });
  });

  it("should store input defaults on modal instance", () => {
    const modalWithDefaults = modal
      .input<{ title: string; message: string }>()
      .create(
        (input) => input,
        { defaultValues: { modal: { title: "Default" } } },
      );

    expect(modalWithDefaults._inputDefaults).toEqual({ title: "Default" });
  });
});
