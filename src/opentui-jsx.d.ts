/**
 * @fileoverview Augments React JSX intrinsic elements with OpenTUI terminal widget tags (`box`,
 * `scrollbox`, `text`, `select`, `tab-select`, `input`) and their prop contracts for
 * `@gg-utils/testing-identities-kit` OpenTUI workflow screens.
 *
 * This file owns ambient JSX augmentation on the global namespace plus `react` and
 * `react/jsx-runtime` so TypeScript accepts OpenTUI markup alongside standard React element typing.
 * Flow: OpenTUI TSX -> intrinsic tag names -> narrowed props for layout, inputs, selects, and text.
 *
 * @example
 * ```typescript
 * import type { ReactElement } from "react";
 *
 * export function TestingIdentitiesKit_OpenTuiSampleRoot(): ReactElement {
 *   return (
 *     <box style={{ flexDirection: "column", gap: 1 }}>
 *       <text bold style={{ fg: "cyan" }}>Testing identities</text>
 *       <select
 *         options={[{ name: "Allocate", value: "allocate", description: "Allocate identity" }]}
 *         onSelect={() => {}}
 *       />
 *     </box>
 *   );
 * }
 * ```
 *
 * @testing CLI: cd packages/testing-identities-kit && npm run type-check
 *
 * @see packages/testing-identities-kit/src/opentui-app.tsx - OpenTUI workflow panel whose TSX consumes these intrinsic elements for forms, previews, and streamed run panes.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Repository file-overview standard this declaration header follows for audits and agent orientation.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

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

declare global {
  namespace JSX {
    interface IntrinsicElements {
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
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
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
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
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
}

export {};
