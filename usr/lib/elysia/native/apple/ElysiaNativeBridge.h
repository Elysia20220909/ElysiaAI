#ifndef ElysiaNativeBridge_h
#define ElysiaNativeBridge_h

#import <Foundation/Foundation.h>

/**
 * ElysiaAI // Legacy Foundation Bridge
 * 
 * Provides an Objective-C interface for the Swift Sovereign Sentinel,
 * ensuring backward compatibility with legacy system frameworks
 * and maintaining the "Absolute Integrity" of the Apple-based core.
 */

@interface ElysiaNativeBridge : NSObject

/**
 * Initializes the resonance bridge between the Swift Sentinel 
 * and the low-level system calls.
 */
- (instancetype)initWithResonanceKey:(NSString *)key;

/**
 * Triggers a system-level audit of the native memory space.
 */
- (BOOL)performNativeAudit:(NSError **)error;

@end

#endif /* ElysiaNativeBridge_h */
