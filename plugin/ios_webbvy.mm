// BLONDA BRIS – iOS: webbvyn ska täcka hela skärmen utan att iOS själv krymper den.
// Sidan lägger själv till säkerhetsmarginalerna (ön upptill, hemlinjen nedtill) med env(safe-area-inset-*).
// Med iOS standardinställning (contentInsetAdjustmentBehavior = automatic) krymper WKWebView dessutom sin
// synliga höjd med samma marginaler, så de räknades två gånger och det blev ett tomrum under tangenterna.
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#include <string>

static bool justera(UIView* v) {
    if ([v isKindOfClass:[WKWebView class]]) {
        UIScrollView* sv = ((WKWebView*) v).scrollView;
        sv.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
        sv.bounces = NO;            // sidan skrollar aldrig; inget gummiband när man drar på tangenterna
        return true;
    }
    for (UIView* s in v.subviews) if (justera(s)) return true;
    return false;
}

// true när webbvyn hittades och justerades (den skapas av JUCE en stund efter fönstret)
bool brisJusteraWebbvy(void* nativeView) {
    return nativeView != nullptr && justera((__bridge UIView*) nativeView);
}

// Mätvärden om webbvyn (skrivs till appens tmp-mapp för CI:s kontroll av layouten i simulatorn)
static WKWebView* hitta(UIView* v) {
    if ([v isKindOfClass:[WKWebView class]]) return (WKWebView*) v;
    for (UIView* s in v.subviews) if (WKWebView* w = hitta(s)) return w;
    return nil;
}
std::string brisWebbvyInfo(void* nativeView) {
    if (nativeView == nullptr) return "ingen vy";
    UIView* root = (__bridge UIView*) nativeView;
    WKWebView* w = hitta(root);
    if (w == nil) return "ingen WKWebView";
    UIScrollView* sv = w.scrollView;
    NSString* t = [NSString stringWithFormat:@"rot %@ frame %@ | webbvy frame %@ safe %@ | scroll inset %@ adjusted %@ behavior %ld bounds %@",
        NSStringFromClass([root class]), NSStringFromCGRect(root.frame), NSStringFromCGRect([w convertRect:w.bounds toView:nil]),
        NSStringFromUIEdgeInsets(w.safeAreaInsets), NSStringFromUIEdgeInsets(sv.contentInset),
        NSStringFromUIEdgeInsets(sv.adjustedContentInset), (long) sv.contentInsetAdjustmentBehavior, NSStringFromCGRect(sv.bounds)];
    return std::string([t UTF8String]);
}
