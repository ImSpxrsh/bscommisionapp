## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** search filters faceted
**Source:** stacks/react.csv | **Found:** 1 results

### Result 1
- **Category:** Forms
- **Guideline:** Debounce rapid input changes
- **Description:** Debounce search/filter inputs
- **Do:** useDeferredValue or debounce for search
- **Don't:** Filter on every keystroke
- **Code Good:** useDeferredValue(searchTerm)
- **Code Bad:** useEffect filtering on every change
- **Severity:** Medium
- **Docs URL:** https://react.dev/reference/react/useDeferredValue

