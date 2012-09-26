=== Analytics360 ===

Contributors: crowdfavorite, alexkingorg
Tags: analytics, google-analytics, email, statistics, stats, dashboard
Requires at least: 3.1
Tested up to: 3.4.2
Stable tag: 1.3.0

MailChimp's Analytics360 plugin allows you to pull Google Analytics and MailChimp data directly into your dashboard, so you can access robust analytics tools without leaving WordPress.

== Description ==

[MailChimp's Analytics360 plugin](http://www.mailchimp.com/wordpress_analytics_plugin/?pid=wordpress&source=website) allows you to pull Google Analytics and MailChimp data directly into your dashboard, so you can access robust analytics tools without leaving WordPress. 

- **Site Traffic:** Visualize your site's traffic trends and see how blog posts and email campaigns affect overall traffic. You can also isolate traffic coming directly to your site from email campaigns with the "campaign traffic" tab. 
- **List Growth:** Chart the growth of your mailing list over time. Compare new and existing subscribers. And if you've got multiple lists, see how they stack up to each other.
- **Top Referrers:** Curious how all that new traffic ended up on your site? Wondering if more people are finding you through search or direct referrals? We'll break it all down for you with Google Analytics. 

MailChimp offers other services for WordPress users, too. A [list subscribe plugin](http://www.mailchimp.com/plugins/mailchimp-wordpress-plugin/) allows you to easily add a signup form for your MailChimp list as a widget on your blog, and [RSS-to-email](http://www.mailchimp.com/features/power_features/rss) sends automatic email campaigns to your readers whenever you publish a new post. 

Learn more at [MailChimp.com](http://www.mailchimp.com/).

*Note: Analytics360 requires PHP 5.*


== Installation ==

1. Unzip the plugin into your `/wp-content/plugins/` directory. If you're uploading it make sure to upload
the entire directory.
1. Activate the plugin through the 'Plugins > Installed' menu from the  WordPress dashboard.
1. Configure the plugin (`Settings > Analytics360`) by associating your MailChimp and Google Analytics accounts (your credentials are *not* stored).
1. Browse to the Analytics360 dashboard (`Dasboard > Analytics360`)


== Frequently Asked Questions ==

= How often is the Google Analytics data updated? =

Google publishes Analytics data once a day around 8PM GMT.

= Do I have to have a MailChimp account to use this plugin? =

No, you can use the Analytics360 plugin without a MailChimp account, but users of MailChimp will see data about traffic sent to their blog via email campaigns aggregated with other stats. Use MailChimp for free if your list has less than 100 subscribers, or upgrade to send to more. Learn more at [MailChimp.com](http://mailchimp.com "Email Marketing from MailChimp").

= What's MailChimp? =

MailChimp is an easy to use tool for designing, sending, and tracking email campaigns. Learn more at [MailChimp.com](http://mailchimp.com "Email Marketing from MailChimp")

= How do I add a MailChimp mailing list signup form to my WordPress blog? =

Use the [MailChimp WordPress plugin](http://www.mailchimp.com/plugins/mailchimp-wordpress-plugin/).

= Does the plugin have any minimum requirements? =

Yes, the Analytics360 plugin requires PHP 5. If you attempt to activate the plugin and PHP 5 is not available you will be presented with an error. 

= Why does Google Authentication fail, with Google telling me that my site is not registered? = 

This is a known issue with Google Data API authentication, affecting some domains. This [Google Groups thread](http://groups.google.com/group/Google-Accounts-API/browse_thread/thread/84556800fcc0cf55/5c274154d6ba6e38) may have the latest information regarding the problem (note: it is not limited to international TLDs).

= How do I report a bug or feature request? =

Please drop us a line if you find a bug or would like to see a new feature added at:   [http://groups.google.com/group/analytics360-discussion](http://groups.google.com/group/analytics360-discussion).

= Who created this plugin? =

[Analytics360](http://www.mailchimp.com/wordpress_analytics_plugin/?pid=wordpress&source=website) was conceptualized and designed by the folks at [MailChimp](http://mailchimp.com "Email Marketing from MailChimp"), and developed by [Crowd Favorite](http://crowdfavorite.com/ "Custom WordPress and web development").


== Screenshots ==

1. The Analytics360 report dashboard.
2. See where in the world your traffic is coming from.
3. See what sites are sending traffic, and dig in to see what stories they're linking.
4. Compare traffic sources to one another.
5. See all your vital Google Analytics data in your WordPress dashboard.


== Changelog ==

= 1.3.0 =

* Updated to address fatal error when attempting to use this plugin with WordPress installed in a subdirectory.
* Updated to new MailChimp API v1.3, adjusted to avoid failures due to other plugins declaring MCAPI of a different version.
* Updated Google Analytics calls and reporting to new v2.4 Analytics API.
* Addressed bug preventing traffic map from displaying properly in Internet Explorer.
* Addressed race condition potentially breaking scaling of traffic graph.

= 1.2.8 =

* Removed non-functioning plugin registration using username/password. API key is the only supported method as of this version.
* Post links in chart work properly for unexpected GUID values.

= 1.2.7 =

* Inclusion of wp-includes/rss.php switched to wp-includes/class-simplepie.php as rss.php was deprecated in WP 3.0.
* Changed GeoMap to GeoChart for the world map widget as GeoMap has been deprecated.

= 1.2.6 =

* Update dashboard styling to better match WordPress 3.2 admin UI
* IE compatibility
* jQuery version compatibility
* Known issue: Traffic By Region map is not displaying correctly in IE9

= 1.2.5 =

* Compatibility with WordPress 3.2 (removed compatibility patch for WP 2.7 that was breaking 3.2)

= 1.2.4 =

* Added ability to connect to mailchimp via an API key instead of username/password

= 1.2.3 =

* Set minimum height of sparkline charts to 30px to match new minimum height requirement in chart API

= 1.2.2 =

* Patched conditional inclusion of HTTP class (3.0 compatibility)
* Added nonce's to authentication commands (security)

= 1.2.1 =

* Security patches, highly recommended upgrade ASAP

= 1.2 =
* Updated to latest MailChimp API class to handle new datacenter `us2` (only affects new MC accounts)
* Updated setup warnings on `Plugins > Installed` page
* Fixed JS bug on dashboard page (only when plugin not fully configured)

= 1.1 =
* Traffic Chart visualization fixes (eg: Y-axis scale begins at 0)
* Inclusion of wp-includes/rss.php switched to include\_once
* Switched plugin links to use site\_url
* Replaced usage of `curl` with HTTP API request class
* Verbose error messages on settings page added to help troubleshooting
* Minimized some JavaScript for smaller download footprints
* Switched to use "stable" Google apis, rather than development
* Fixed issue where some UI elements could be hidden in Internet Explorer using 2.8

= 1.0 =
* First public release.
