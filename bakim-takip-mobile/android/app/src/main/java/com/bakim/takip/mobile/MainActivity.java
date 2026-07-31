package com.bakim.takip.mobile;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Debug build'lerde bile WebView uzaktan hata ayıklamayı (chrome://inspect) kapalı tut;
        // cihaz kaybolur/çalınırsa yerel verinin canlı incelenmesini engeller.
        WebView.setWebContentsDebuggingEnabled(false);
        super.onCreate(savedInstanceState);
    }
}
