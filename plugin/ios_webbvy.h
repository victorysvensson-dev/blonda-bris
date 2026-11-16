// BLONDA BRIS – iOS: webbvyns justering (ios_webbvy.mm). Bara på iOS.
#pragma once
#include <string>

bool brisJusteraWebbvy(void* nativeView);       // true när WKWebView hittades och justerades
std::string brisWebbvyInfo(void* nativeView);   // mätvärden om webbvyn (för layoutkontrollen i CI)
