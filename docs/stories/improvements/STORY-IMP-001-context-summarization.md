# Story IMP-001: Context Summarization for Token Management

## Story
As a Context Manager, I need to implement automatic context summarization to prevent token overflow and optimize Claude Code's performance over long sessions.

## Background
Based on research insights, Claude Code performance degrades after ~2 hours due to accumulated context. Implementing context summarization will help maintain performance and extend working sessions.

## Acceptance Criteria
1. **Automatic Summarization Trigger**
   - Context Manager monitors total context size
   - Triggers summarization when size exceeds 80% of threshold (e.g., 80KB out of 100KB limit)
   - Preserves critical information while reducing size

2. **Summarization Algorithm**
   - Implements compression for older contexts (> 30 minutes old)
   - Maintains full fidelity for recent contexts (< 30 minutes)
   - Uses structured extraction to preserve key data points
   - Compresses verbose logs into concise summaries

3. **Context Prioritization**
   - Global contexts preserved at full fidelity
   - Active agent contexts maintained in detail
   - Completed task contexts summarized aggressively
   - Failed task contexts preserved for debugging

4. **Retrieval Enhancement**
   - Summary includes metadata for expansion if needed
   - Original context archived before summarization
   - Fast retrieval of summarized contexts
   - Ability to restore full context on demand

## Technical Requirements
- Implement `summarizeContext()` method in ContextManager
- Add `compressionRatio` tracking to context metadata
- Create `ContextSummarizer` utility class
- Add configuration for summarization thresholds

## Implementation Details

```javascript
// ContextManager enhancement
class ContextManager {
  async summarizeContext(contextId, compressionLevel = 'medium') {
    const context = await this.getContext(contextId);
    const summarizer = new ContextSummarizer(compressionLevel);
    
    // Archive original
    await this.archiveContext(contextId);
    
    // Summarize based on type
    const summary = await summarizer.summarize(context);
    
    // Update with compressed version
    await this.updateContext(contextId, {
      ...summary,
      compressed: true,
      compressionRatio: summary.size / context.size,
      originalArchiveId: context.archiveId
    });
  }
  
  async monitorContextSize() {
    const totalSize = await this.calculateTotalSize();
    if (totalSize > this.config.sizeThreshold * 0.8) {
      await this.triggerSummarization();
    }
  }
}
```

## Test Cases
1. Test automatic trigger at 80% threshold
2. Verify critical data preservation
3. Test retrieval of summarized contexts
4. Validate compression ratios
5. Test archive restoration

## Dependencies
- Enhanced ContextManager (already implemented)
- New ContextSummarizer utility
- Archive storage mechanism

## Effort Estimate
3-4 hours of implementation

## Priority
High - Directly addresses Claude Code performance degradation issue

## Notes
- Consider using JSON path expressions for selective preservation
- May need different summarization strategies per context level
- Should integrate with existing file-based storage seamlessly