#import "ElysiaNativeBridge.h"
// Import the generated header for Swift visibility
// In a real project, this would be "ProjectName-Swift.h"
#import "ElysiaAI-Swift.h" 

@implementation ElysiaNativeBridge {
    SovereignSentinel *_sentinel;
}

- (instancetype)initWithResonanceKey:(NSString *)key {
    self = [super init];
    if (self) {
        // [Upgrade] Bridging directly to the modern Swift Sentinel
        _sentinel = [[SovereignSentinel alloc] initWithResonanceKey:key];
        NSLog(@"[Elysia Bridge] Objective-C Bridge initialized via Swift Sentinel.");
    }
    return self;
}

- (BOOL)performNativeAudit:(NSError **)error {
    NSLog(@"[Elysia Bridge] Relaying Audit Request to Swift Core...");
    
    // [Upgrade] Using Swift's error-throwing mechanism bridged to Objective-C
    return [_sentinel performNativeAuditAndReturnError:error];
}

@end
