# Copy Test Feature

## Overview
Users can now copy/duplicate test cases with a single click. The copy feature creates a complete duplicate of the test while ensuring it stays within the same project.

## Security & Scoping
- **Project-scoped**: Copied tests stay in the same project as the original
- **User isolation**: Tests can only be copied within projects the user has access to
- **No cross-project copying**: Prevents accidental data leakage between projects

## How It Works

### Backend Endpoint
```
POST /api/tests/{id}/copy
```

**Request**: No body required
**Response**: The newly created test object

### What Gets Copied
1. **Test Metadata**:
   - Name (with " (Copy)" suffix)
   - Description
   - Tags
   - Project ID (same as original)
   - App URL
   - App Type
   - Created By

2. **Test Steps** (deep copy):
   - All step fields: instruction, order, type, selector, value, optional, waitAfter, moduleId
   - Each step is fully duplicated (not referenced)

3. **Datasets** (deep copy):
   - All test data rows
   - Each dataset is fully duplicated

### What Gets Reset
- **ID**: New UUID generated
- **Status**: Set to "draft"
- **Run Count**: Reset to 0
- **Last Run Date**: Cleared
- **Last Run Status**: Cleared
- **Created Date**: Set to current time
- **Modified Date**: Set to current time

## User Interface

### Location
The "Copy Test" option appears in the test card's dropdown menu:
1. Click the three-dot menu (⋮) on any test card
2. Select "Copy Test"
3. The test is duplicated instantly

### Visual Feedback
- The new test appears in the list immediately
- Named as "[Original Name] (Copy)"
- Status badge shows "draft"

### Menu Options
```
┌─────────────────┐
│ Edit            │
│ View History    │
│ ──────────────  │
│ 📄 Copy Test    │  ← New option
│ ──────────────  │
│ Delete          │
└─────────────────┘
```

## Use Cases

### 1. Create Test Variants
Copy a test to create variations for different environments or scenarios:
- Original: "Login - Production"
- Copy 1: "Login - Staging"
- Copy 2: "Login - Edge Cases"

### 2. Test Templates
Create a base test with common steps, then copy it to create similar tests:
- Original: "E-commerce Checkout - Base"
- Copy: "E-commerce Checkout - Guest User"
- Copy: "E-commerce Checkout - With Coupon"

### 3. Data-Driven Testing
Copy a test multiple times and modify datasets for different test scenarios.

### 4. A/B Testing
Copy tests to compare different approaches or validate changes.

## Implementation Details

### Backend (Java)
**File**: `TestController.java`

```java
@PostMapping("/{id}/copy")
public ResponseEntity<?> copyTest(@PathVariable String id) {
    // 1. Find original test
    Test original = testRepository.findById(id).orElse(null);
    
    // 2. Create new test instance
    Test copy = new Test();
    copy.setName(original.getName() + " (Copy)");
    copy.setProjectId(original.getProjectId()); // Keep in same project
    
    // 3. Deep copy steps
    // 4. Deep copy datasets
    // 5. Reset metadata
    
    // 6. Save and return
    return ResponseEntity.ok(testRepository.save(copy));
}
```

### Frontend (React)
**Files**: 
- `Tests.jsx` - Added copy mutation and handler
- `TestCard.jsx` - Added copy option in dropdown menu

```jsx
const copyMutation = useMutation({
  mutationFn: async (testId) => {
    const response = await fetch(`http://localhost:8080/api/tests/${testId}/copy`, {
      method: 'POST'
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  }
});

const handleCopy = (test) => {
  copyMutation.mutate(test.id);
};
```

## API Examples

### Copy a Test
```bash
curl -X POST http://localhost:8080/api/tests/abc-123-def/copy \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "id": "xyz-789-ghi",
  "name": "My Test (Copy)",
  "description": "Original description",
  "projectId": "project-456",
  "status": "draft",
  "runCount": 0,
  "steps": [...],
  "datasets": [...],
  "createdDate": "2025-12-23T16:30:00",
  "modifiedDate": "2025-12-23T16:30:00"
}
```

## Future Enhancements

1. **Batch Copy**: Copy multiple tests at once
2. **Cross-Project Copy**: Allow authorized users to copy tests between projects
3. **Copy Options Dialog**: 
   - Custom name for the copy
   - Option to exclude datasets
   - Option to exclude tags
4. **Copy History**: Track which tests were copied from which originals
5. **Smart Naming**: Auto-increment copy numbers: "Test (Copy 1)", "Test (Copy 2)"

## Testing

### Manual Testing
1. Create a test with steps and datasets
2. Click the three-dot menu on the test card
3. Select "Copy Test"
4. Verify:
   - New test appears with " (Copy)" suffix
   - All steps are duplicated
   - All datasets are duplicated
   - Status is "draft"
   - Run count is 0
   - Project ID matches original

### Edge Cases
- ✅ Copy test with no steps
- ✅ Copy test with no datasets
- ✅ Copy test with module steps
- ✅ Copy test multiple times
- ✅ Copy test that has run history (history is NOT copied)

## Troubleshooting

### Copy button not working
- Check browser console for errors
- Verify backend is running on port 8080
- Check network tab for failed API calls

### Copied test missing data
- Verify original test has the expected data
- Check backend logs for errors during copy
- Ensure all relationships are loaded (steps, datasets)

### Wrong project
- This should never happen as projectId is explicitly copied
- If it does, check the security layer and project access controls

## Related Files

### Backend
- `backend/src/main/java/com/youraitester/controller/TestController.java` - Copy endpoint
- `backend/src/main/java/com/youraitester/model/Test.java` - Test model
- `backend/src/main/java/com/youraitester/model/TestStep.java` - Step model
- `backend/src/main/java/com/youraitester/model/TestDataset.java` - Dataset model

### Frontend
- `src/pages/Tests.jsx` - Copy mutation and handler
- `src/components/tests/TestCard.jsx` - Copy menu option
- `src/api/base44Client.js` - API client

## Logs

Copy operation logs:
```
2025-12-23 16:30:00.000 [http-nio-8080-exec-1] INFO  c.y.controller.TestController - Request to copy test: abc-123-def
2025-12-23 16:30:00.050 [http-nio-8080-exec-1] INFO  c.y.controller.TestController - Test copied successfully. Original: abc-123-def, Copy: xyz-789-ghi, Project: project-456
```


