<div class="wrap a360-wrap">
	<h2 class="a360-head">
		<div class="a360-header-links">
			<a href="http://analytics.google.com">visit Google Analytics</a>
			<span>|</span>
			<a href="http://mailchimp.com">visit MailChimp</a>
		</div>
		<?php echo __('Analytics360°', 'analytics360'); ?>
	</h2>
	<p class="a360-subhead" id="a360-header-credit">compliments of <a class="a360-mailchimp-link" href="http://mailchimp.com"><span>MailChimp</span></a></p>
	<p id="a360-notification"><?php echo $notification; ?></p>
	<?php if (!a360_MCAPI_is_compatible()) : ?>
		<p class="error"><strong>Uh oh!</strong> You appear to have an older version of MailChimp's list signup WordPress plugin. Analytics 360° is not compatible with older versions of that plugin. Please <a href="http://www.mailchimp.com/plugins/mailchimp-wordpress-plugin/">update to the latest version</a>.
	<?php endif; ?>
	
