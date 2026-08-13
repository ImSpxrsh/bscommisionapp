## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** responsive layout
**Source:** stacks/html-tailwind.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Guideline:** Responsive padding
- **Description:** Adjust padding for different screen sizes
- **Do:** px-4 md:px-6 lg:px-8
- **Don't:** Same padding all sizes
- **Code Good:** px-4 sm:px-6 lg:px-8
- **Code Bad:** px-8 (same all sizes)
- **Severity:** Medium
- **Docs URL:** 

### Result 2
- **Category:** Images
- **Guideline:** Responsive images
- **Description:** Serve appropriate image sizes
- **Do:** srcset and sizes attributes
- **Don't:** Same large image all devices
- **Code Good:** srcset with multiple sizes
- **Code Bad:** 4000px image everywhere
- **Severity:** High
- **Docs URL:** 

### Result 3
- **Category:** Responsive
- **Guideline:** Hidden/shown utilities
- **Description:** Control visibility per breakpoint
- **Do:** hidden md:block
- **Don't:** Different content per breakpoint
- **Code Good:** hidden md:flex
- **Code Bad:** Separate mobile/desktop components
- **Severity:** Low
- **Docs URL:** https://tailwindcss.com/docs/display

