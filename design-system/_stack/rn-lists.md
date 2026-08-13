## UI Pro Max Stack Guidelines
**Stack:** react-native | **Query:** list performance navigation
**Source:** stacks/react-native.csv | **Found:** 3 results

### Result 1
- **Category:** Navigation
- **Guideline:** Type navigation params
- **Description:** Type-safe navigation
- **Do:** Typed navigation props
- **Don't:** Untyped navigation
- **Code Good:** navigation.navigate<RootStackParamList>('Home', { id })
- **Code Bad:** navigation.navigate('Home', { id })
- **Severity:** Medium
- **Docs URL:** 

### Result 2
- **Category:** Navigation
- **Guideline:** Use React Navigation
- **Description:** Standard navigation library
- **Do:** React Navigation for routing
- **Don't:** Manual navigation management
- **Code Good:** createStackNavigator()
- **Code Bad:** Custom navigation state
- **Severity:** Medium
- **Docs URL:** https://reactnavigation.org/

### Result 3
- **Category:** Lists
- **Guideline:** Optimize renderItem
- **Description:** Memoize list item components
- **Do:** React.memo for list items
- **Don't:** Inline render function
- **Code Good:** renderItem={({ item }) => <MemoizedItem item={item} />}
- **Code Bad:** renderItem={({ item }) => <View>...</View>}
- **Severity:** High
- **Docs URL:** 

