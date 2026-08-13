## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** form validation multi-step
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Props
- **Guideline:** Validate props with TypeScript
- **Description:** Use TypeScript interfaces for prop types
- **Do:** interface Props { name: string }
- **Don't:** PropTypes or no validation
- **Code Good:** interface ButtonProps { onClick: () => void }
- **Code Bad:** Button.propTypes = {}
- **Severity:** Medium
- **Docs URL:** 

### Result 2
- **Category:** Components
- **Guideline:** Keep components small and focused
- **Description:** Single responsibility for each component
- **Do:** One concern per component
- **Don't:** Large multi-purpose components
- **Code Good:** <UserAvatar /><UserName />
- **Code Bad:** <UserCard /> with 500 lines
- **Severity:** Medium
- **Docs URL:** 

### Result 3
- **Category:** State
- **Guideline:** Initialize state lazily
- **Description:** Use function form for expensive initial state
- **Do:** useState(() => computeExpensive())
- **Don't:** useState(computeExpensive())
- **Code Good:** useState(() => JSON.parse(data))
- **Code Bad:** useState(JSON.parse(data))
- **Severity:** Medium
- **Docs URL:** https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state

