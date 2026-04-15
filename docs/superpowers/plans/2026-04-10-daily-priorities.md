# Daily Priorities — 2026-04-10 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Storybook Input/Select with Filled state, sync new design tokens, and design Initial + Verified portfolio states in Figma.

**Architecture:** Three independent priorities executed sequentially. P1 updates existing Storybook components with a new Filled state matching Figma. P2 adds two new semantic tokens to JSON files. P3 creates two new Figma frames on the Portfolio page using existing components + new checklist card component.

**Tech Stack:** React Native / Gluestack UI / NativeWind (P1), Design Tokens JSON (P2), Figma Plugin API via MCP (P3)

**Tools/MCPs:** Figma Console MCP (all priorities), Storybook (P1 validation)

---

## Chunk 1: Priority 1 — Storybook Input & Select Filled State

### Key findings from Figma analysis

**Filled state visual differences vs Default:**

| Property | Default | Filled |
|----------|---------|--------|
| Input text color | `text color/muted` (placeholder gray) | `text color/filled` (near-black) |
| Outlined bg | `bg/canvas` (#FEFEFF) | `bg/glass` (black 5% opacity) |
| Fill variant bg | `bg/glass` (same) | `bg/glass` (same) |
| Border | unchanged | unchanged |
| Font | Inter Regular (same) | Inter Regular (same) |

**Select Filled differences vs Default:**

| Property | Default | Filled |
|----------|---------|--------|
| Select text color | `text color/muted` | `text color/filled` |
| Background | `bg/canvas` (same across variants) | `bg/canvas` (unchanged for Select) |
| Border | unchanged | unchanged |

**New semantic tokens needed (covered in Chunk 2):**
- `bg/glass` — `rgba(0,0,0,0.05)` light / `rgba(255,255,255,0.05)` dark
- `text color/filled` — aliases to primitive dark text light / light text dark

### Task 1: Update Input component with Filled state styling

**Files:**
- Modify: `Elysium/packages/app/components/ui/input/index.tsx`

The "Filled" state is a visual presentation state, not an interactive state. In practice, the Input component already displays typed text in `text-typography-900`. The Filled state in Figma represents the component with a value entered. The key difference is the background changes for Outlined variant.

- [ ] **Step 1: Read the current Input component** to confirm current styling
- [ ] **Step 2: Add `bg-black/5` background class** to the Outlined variant when value is present (this maps to `bg/glass` token). Note: The Fill variant already uses this background. The Underlined variant has no background change.

Since the "Filled" state in Figma is really about showing "what the component looks like with a value typed in" — and the text color change from muted→filled happens automatically when real text replaces placeholder — the only code change needed is ensuring the Outlined variant can show the glass background when filled. This is a story/demo concern more than a component change.

- [ ] **Step 3: Verify** no component code changes are actually needed — the Filled state is handled by the platform (placeholder text is gray, typed text is dark automatically)

### Task 2: Create Input Storybook stories

**Files:**
- Create: `Elysium/packages/app/components/ui/input/Input.stories.tsx`

- [ ] **Step 1: Create the story file** with stories for all variant × size × state combinations, including the new Filled state

Stories to create:
- `Default` — basic input with placeholder
- `Filled` — input with a value pre-filled
- `Focused` — input in focus state
- `Invalid` — input with error state
- `Disabled` — disabled input
- `AllVariants` — grid showing Outlined, Underlined, Fill across all sizes
- `AllStates` — grid showing Default, Filled, Focused, Invalid, Disabled for each variant
- `WithFormControl` — wrapped in FormControl with label, helper text, and error text

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input, InputField, InputIcon, InputSlot } from './index';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
  FormControlError,
  FormControlErrorText,
} from '../form-control/index';
import { SearchIcon, EyeIcon } from 'lucide-react-native';
import { View, Text } from 'react-native';

const meta: Meta<typeof Input> = {
  title: 'ui/Input',
  component: Input,
  argTypes: {
    variant: {
      control: 'select',
      options: ['outline', 'underlined', 'rounded'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: (args) => (
    <Input {...args}>
      <InputField placeholder="Placeholder text" />
    </Input>
  ),
  args: {
    variant: 'outline',
    size: 'md',
  },
};

export const Filled: Story = {
  render: (args) => (
    <Input {...args}>
      <InputField value="Filled value" />
    </Input>
  ),
  args: {
    variant: 'outline',
    size: 'md',
  },
};

export const AllStates: Story = {
  render: () => {
    const variants = ['outline', 'underlined', 'rounded'] as const;
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    return (
      <View style={{ gap: 32 }}>
        {variants.map((variant) => (
          <View key={variant} style={{ gap: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Text>
            {sizes.map((size) => (
              <View key={size} style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#737373' }}>{size}</Text>
                <View style={{ gap: 4 }}>
                  <FormControl size={size}>
                    <FormControlLabel>
                      <FormControlLabelText>Default</FormControlLabelText>
                    </FormControlLabel>
                    <Input variant={variant} size={size}>
                      <InputField placeholder="Placeholder text" />
                    </Input>
                  </FormControl>
                  <FormControl size={size}>
                    <FormControlLabel>
                      <FormControlLabelText>Filled</FormControlLabelText>
                    </FormControlLabel>
                    <Input variant={variant} size={size}>
                      <InputField value="Placeholder text" />
                    </Input>
                  </FormControl>
                  <FormControl size={size} isInvalid>
                    <FormControlLabel>
                      <FormControlLabelText>Invalid</FormControlLabelText>
                    </FormControlLabel>
                    <Input variant={variant} size={size}>
                      <InputField placeholder="Placeholder text" />
                    </Input>
                    <FormControlError>
                      <FormControlErrorText>Error message</FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                  <FormControl size={size} isDisabled>
                    <FormControlLabel>
                      <FormControlLabelText>Disabled</FormControlLabelText>
                    </FormControlLabel>
                    <Input variant={variant} size={size}>
                      <InputField placeholder="Placeholder text" />
                    </Input>
                  </FormControl>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  },
};

export const WithFormControl: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 400 }}>
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Email</FormControlLabelText>
        </FormControlLabel>
        <Input variant="outline">
          <InputField placeholder="Enter your email" />
        </Input>
        <FormControlHelper>
          <FormControlHelperText>We'll never share your email</FormControlHelperText>
        </FormControlHelper>
      </FormControl>
      <FormControl isInvalid>
        <FormControlLabel>
          <FormControlLabelText>Password</FormControlLabelText>
        </FormControlLabel>
        <Input variant="outline">
          <InputField placeholder="Enter password" type="password" />
        </Input>
        <FormControlError>
          <FormControlErrorText>Password must be at least 8 characters</FormControlErrorText>
        </FormControlError>
      </FormControl>
    </View>
  ),
};
```

- [ ] **Step 2: Run Storybook** to validate

```bash
cd Elysium/services/stories && yarn storybook
```

- [ ] **Step 3: Screenshot** Storybook output and compare with Figma screenshots

### Task 3: Create Select Storybook stories

**Files:**
- Create: `Elysium/packages/app/components/ui/select/Select.stories.tsx`

- [ ] **Step 1: Create the story file** with stories matching the Input pattern

Stories to create:
- `Default` — select with placeholder
- `Filled` — select with a value selected
- `AllStates` — grid showing Default, Filled, Invalid, Disabled for each variant × size
- `WithFormControl` — wrapped in FormControl

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from './index';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
  FormControlError,
  FormControlErrorText,
} from '../form-control/index';
import { ChevronDownIcon } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { Icon } from '../icon/index';

const meta: Meta<typeof Select> = {
  title: 'ui/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

const SelectExample = ({
  variant = 'outline',
  size = 'md',
  placeholder = 'Select option',
  selectedValue,
  isDisabled = false,
  isInvalid = false,
}: {
  variant?: 'outline' | 'underlined' | 'rounded';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  placeholder?: string;
  selectedValue?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
}) => (
  <Select isDisabled={isDisabled} selectedValue={selectedValue}>
    <SelectTrigger variant={variant} size={size}>
      <SelectInput placeholder={placeholder} />
      <SelectIcon className="mr-3" as={ChevronDownIcon} />
    </SelectTrigger>
    <SelectPortal>
      <SelectBackdrop />
      <SelectContent>
        <SelectDragIndicatorWrapper>
          <SelectDragIndicator />
        </SelectDragIndicatorWrapper>
        <SelectItem label="Option 1" value="opt1" />
        <SelectItem label="Option 2" value="opt2" />
        <SelectItem label="Option 3" value="opt3" />
      </SelectContent>
    </SelectPortal>
  </Select>
);

export const Default: Story = {
  render: () => <SelectExample />,
};

export const Filled: Story = {
  render: () => <SelectExample selectedValue="opt1" />,
};

export const AllStates: Story = {
  render: () => {
    const variants = ['outline', 'underlined', 'rounded'] as const;
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    return (
      <View style={{ gap: 32 }}>
        {variants.map((variant) => (
          <View key={variant} style={{ gap: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Text>
            {sizes.map((size) => (
              <View key={size} style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#737373' }}>{size}</Text>
                <View style={{ gap: 4 }}>
                  <FormControl size={size}>
                    <FormControlLabel>
                      <FormControlLabelText>Default</FormControlLabelText>
                    </FormControlLabel>
                    <SelectExample variant={variant} size={size} />
                  </FormControl>
                  <FormControl size={size}>
                    <FormControlLabel>
                      <FormControlLabelText>Filled</FormControlLabelText>
                    </FormControlLabel>
                    <SelectExample variant={variant} size={size} selectedValue="opt1" />
                  </FormControl>
                  <FormControl size={size} isInvalid>
                    <FormControlLabel>
                      <FormControlLabelText>Invalid</FormControlLabelText>
                    </FormControlLabel>
                    <SelectExample variant={variant} size={size} isInvalid />
                  </FormControl>
                  <FormControl size={size} isDisabled>
                    <FormControlLabel>
                      <FormControlLabelText>Disabled</FormControlLabelText>
                    </FormControlLabel>
                    <SelectExample variant={variant} size={size} isDisabled />
                  </FormControl>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  },
};

export const WithFormControl: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 400 }}>
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Country</FormControlLabelText>
        </FormControlLabel>
        <SelectExample placeholder="Select your country" />
        <FormControlHelper>
          <FormControlHelperText>Choose your country of residence</FormControlHelperText>
        </FormControlHelper>
      </FormControl>
      <FormControl isInvalid>
        <FormControlLabel>
          <FormControlLabelText>Currency</FormControlLabelText>
        </FormControlLabel>
        <SelectExample placeholder="Select currency" />
        <FormControlError>
          <FormControlErrorText>Currency is required</FormControlErrorText>
        </FormControlError>
      </FormControl>
    </View>
  ),
};
```

- [ ] **Step 2: Validate in Storybook** — run and screenshot
- [ ] **Step 3: Compare with Figma** screenshots of all states

---

## Chunk 2: Priority 2 — Token JSON Update

### Task 4: Add new semantic tokens to JSON files

**Files:**
- Modify: `elysium-design/tokens/semantic/Light.tokens.json`
- Modify: `elysium-design/tokens/semantic/Dark.tokens.json`
- Modify: `Elysium/packages/app/tokens/semantic/Light.tokens.json`
- Modify: `Elysium/packages/app/tokens/semantic/Dark.tokens.json`

**New tokens identified from Figma:**

| Token | Light Mode | Dark Mode | Type |
|-------|-----------|-----------|------|
| `bg/glass` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` | COLOR |
| `text color/filled` | alias → primitive dark text | alias → primitive light text | COLOR |

- [ ] **Step 1: Extract full token data from Figma** — get the exact variable values including alias references and Figma variable IDs

- [ ] **Step 2: Read current `elysium-design/tokens/semantic/Light.tokens.json`** and find correct insertion point (alphabetical within category)

- [ ] **Step 3: Add `bg/glass` token** to both Light and Dark semantic token files

For Light:
```json
"glass": {
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [0, 0, 0],
    "alpha": 0.05,
    "hex": "#000000"
  },
  "$extensions": {
    "com.figma.variableId": "VariableID:929:91049",
    "com.figma.scopes": ["ALL_SCOPES"]
  }
}
```

- [ ] **Step 4: Add `text color/filled` token** to both Light and Dark semantic token files

- [ ] **Step 5: Resolve the alias targets** — get the primitive variable names that `text color/filled` points to in each mode

- [ ] **Step 6: Copy updated files** to `Elysium/packages/app/tokens/`

```bash
cp elysium-design/tokens/semantic/Light.tokens.json Elysium/packages/app/tokens/semantic/Light.tokens.json
cp elysium-design/tokens/semantic/Dark.tokens.json Elysium/packages/app/tokens/semantic/Dark.tokens.json
```

- [ ] **Step 7: Verify** diff between old and new token files shows only the two new tokens

---

## Chunk 3: Priority 3 — Portfolio Initial & Verified States in Figma

### Task 5: Audit existing components and text styles

- [ ] **Step 1: Screenshot the existing Active state** (961:2503) at higher detail to catalog all components used
- [ ] **Step 2: List all text styles** available in the file
- [ ] **Step 3: List available font styles** (per feedback_figma_fonts memory — only use fonts that exist)
- [ ] **Step 4: Identify existing components** that can be reused: header bar, fund tile, chart, section headings

### Task 6: Create Onboarding Checklist Card component

**Location:** Base Components page (node 12:6504, per feedback_component_location memory)

- [ ] **Step 1: Screenshot Base Components page** to find clear space
- [ ] **Step 2: Create the Checklist Card component** via `figma_execute`:
  - Auto-layout vertical container
  - Rounded corners (radius/l token)
  - Background: `bg/surface` token
  - Padding: space tokens
  - Two checklist rows:
    - Row 1 (completed): green numbered circle + "Portfolio created" + "You're in!" subtext + check icon
    - Row 2 (actionable): green numbered circle + "Verify your identity" + subtext + chevron icon
  - All text using existing text styles
  - All colors bound to semantic tokens

- [ ] **Step 3: Screenshot and validate** the component
- [ ] **Step 4: Create a variant** with all steps completed (for potential future use)

### Task 7: Create Initial State frame

**Location:** Portfolio page (61:2466), positioned next to existing frames

- [ ] **Step 1: Create a 393×852 frame** (iPhone 14 Pro dimensions matching existing Active state)
  - Name: "Portfolio, Onboarding"
  - Position: to the right of the wireframe (x ~6700)
  - Background: `bg/canvas` token

- [ ] **Step 2: Build the header section**
  - Avatar circle + @username text
  - Utility icons (notifications, settings, menu)
  - Use existing header pattern from Active state as reference

- [ ] **Step 3: Add $0.00 balance display**
  - Large text: "$0.00"
  - Subtext: portfolio value label
  - Match typography from Active state's balance area

- [ ] **Step 4: Add "Get ready to Invest" heading**
  - Section heading text style
  - Positioned below balance

- [ ] **Step 5: Insert Checklist Card instance**
  - Instance of the component created in Task 6
  - Full width with horizontal margins

- [ ] **Step 6: Add "Pending invitations" section**
  - Section heading
  - Fund tile (clone from Active state's fund tiles)
  - Add lock overlay: semi-transparent dark overlay with lock icon centered
  - "Invited by Michael Manager" subtext below

- [ ] **Step 7: Screenshot and validate** against wireframe (965:3901)
- [ ] **Step 8: Iterate** — fix any spacing, alignment, or token binding issues (max 3 iterations)

### Task 8: Create Verified State frame

**Location:** Portfolio page, next to Initial State frame

- [ ] **Step 1: Clone the Initial State frame**
  - Name: "Portfolio, Verified"
  - Position: to the right of Initial State

- [ ] **Step 2: Remove the Checklist Card** — user is now verified

- [ ] **Step 3: Update Pending invitations section**
  - Remove lock overlay from fund tile
  - Fund tile is now tappable (no visual lock)

- [ ] **Step 4: Add empty chart placeholder**
  - Empty state frame with chart area
  - Subtle message: "Your portfolio performance will appear here"
  - Use `text color/muted` for empty state text

- [ ] **Step 5: Add empty Holdings section**
  - Section heading: "Holdings"
  - Empty state message: "No holdings yet"
  - Use consistent empty state styling

- [ ] **Step 6: Add empty Pending Orders section**
  - Section heading: "Pending Orders"
  - Empty state message: "No pending orders"

- [ ] **Step 7: Screenshot and validate**
- [ ] **Step 8: Iterate** — fix spacing, alignment, token binding (max 3 iterations)

### Task 9: Final validation

- [ ] **Step 1: Screenshot all three portfolio states side by side** (Onboarding → Verified → Active)
- [ ] **Step 2: Verify token binding** — no raw hex values, all colors bound to variables
- [ ] **Step 3: Verify text styles** — all text uses existing file text styles
- [ ] **Step 4: Verify component usage** — reused existing components where possible
- [ ] **Step 5: Present final screenshots** to user for review
