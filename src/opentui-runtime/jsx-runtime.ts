export { jsx, jsxs, Fragment } from "react/jsx-runtime";
import type { Key, ReactNode } from "react";

type TestingIdentitiesKitOpenTui_Option = {
  readonly description?: string;
  readonly name?: string;
  readonly value?: string;
};

type TestingIdentitiesKitOpenTui_Style = {
  readonly flexDirection?: "column" | "row";
  readonly flexGrow?: number;
  readonly gap?: number;
  readonly maxHeight?: number;
  readonly padding?: number;
  readonly fg?: string;
};

type TestingIdentitiesKitOpenTui_ContainerProps = {
  readonly children?: ReactNode;
  readonly key?: Key;
  readonly style?: TestingIdentitiesKitOpenTui_Style;
};

type TestingIdentitiesKitOpenTui_TextProps = {
  readonly bold?: boolean;
  readonly children?: ReactNode;
  readonly key?: Key;
  readonly style?: TestingIdentitiesKitOpenTui_Style;
};

type TestingIdentitiesKitOpenTui_SelectProps = {
  readonly children?: ReactNode;
  readonly key?: Key;
  readonly onChange?: (
    index: number,
    option: TestingIdentitiesKitOpenTui_Option | undefined,
  ) => void;
  readonly onSelect?: (
    index: number,
    option: TestingIdentitiesKitOpenTui_Option | undefined,
  ) => void;
  readonly options?: readonly TestingIdentitiesKitOpenTui_Option[];
  readonly selectedIndex?: number;
  readonly showDescription?: boolean;
  readonly style?: TestingIdentitiesKitOpenTui_Style;
  readonly value?: string;
};

// TypeScript requires the JSX namespace to describe this terminal renderer.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
    export type Element = import("react").JSX.Element;
    export type ElementType = import("react").JSX.ElementType;
    export type ElementChildrenAttribute = import("react").JSX.ElementChildrenAttribute;
    export type IntrinsicAttributes = import("react").JSX.IntrinsicAttributes;
    export interface IntrinsicElements {
      box: TestingIdentitiesKitOpenTui_ContainerProps;
      input: {
        readonly children?: ReactNode;
        readonly key?: Key;
        readonly onChange?: (value: string) => void;
        readonly style?: TestingIdentitiesKitOpenTui_Style;
        readonly value?: string;
      };
      scrollbox: TestingIdentitiesKitOpenTui_ContainerProps;
      select: TestingIdentitiesKitOpenTui_SelectProps;
      "tab-select": TestingIdentitiesKitOpenTui_SelectProps;
      text: TestingIdentitiesKitOpenTui_TextProps;
    }
  }
