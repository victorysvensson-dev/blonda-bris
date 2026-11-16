// BLONDA BRIS – iOS: webbvyn ska täcka hela skärmen utan att iOS själv krymper den.
// Sidan lägger själv till säkerhetsmarginalerna (ön upptill, hemlinjen nedtill) med env(safe-area-inset-*).
// Med iOS standardinställning (contentInsetAdjustmentBehavior = automatic) krymper WKWebView dessutom sin
// synliga höjd med samma marginaler, så de räknades två gånger och det blev ett tomrum under tangenterna.
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

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
