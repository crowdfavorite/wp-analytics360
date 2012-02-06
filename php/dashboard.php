<?php /*<div class="wrap">*/?>

	<?php if (empty($a360_ga_token)) : ?>
		<h2>Feed The Chimp!</h2>
		<p>
			Analytics360° needs to be set up before you can track your stats!
			<a href="<?php echo site_url('/wp-admin/options-general.php?page=analytics360.php');?>">Do this on the settings page</a>.
			<?php return; ?>
		</p>
	<?php endif; ?> 

	<div id="a360-datepicker">
		<div id="a360-datepicker-pane" style="display:none;">
			<div id="a360-datepicker-calendars"></div>
			<input type="submit" id="a360-apply-date-range" class="button" value="Apply" />
			<div id="a360-current-date-range-desc"></div>
		</div>
		<div id="a360-datepicker-popup">
			<div id="a360-current-date-range">
				<div id="a360-current-start-date"><input style="display:none;" type="text" /><span>Loading</span></div> - 
				<div id="a360-current-end-date"><input style="display:none;" type="text" /><span></span></div>
			</div>
		</div>
	</div>
	
	<div class="a360-box" id="a360-box-site-traffic">
		<div class="a360-box-header"><h3>Site Traffic</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<ul id="a360-linechart-legend">
				<li class="blog-post" style="display:none;">blog post</li>
				<li class="campaign" style="display:none;">email campaign</li>
			</ul>
			<ul class="a360-tabs left">
			</ul>
			<ul class="a360-tab-contents border">
				<li id="a360-all-traffic-container">
					<div id="a360-all-traffic-graph">
					</div>
				</li>
				<li id="a360-campaign-traffic-container" style="display:none">
				</li>
			</ul>
			<div class="a360-stats-container">
				<dl class="a360-stats-list" style="display:none;">
					<dt>Visits</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-visits-spark"></div>
						<div class="a360-stat" id="a360-stat-visits"></div>
					</dd>
					<dt>Pageviews</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-pageviews-spark"></div>
						<div class="a360-stat" id="a360-stat-pageviews"></div>
					</dd>
					<dt>Pages/Visit</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-pages-per-visit-spark"></div>
						<div class="a360-stat" id="a360-stat-pages-per-visit"></div>
					</dd>
				</dl>
			</div>
			<div class="a360-stats-container">
				<dl class="a360-stats-list" style="display:none;">
					<dt>Bounce Rate</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-bounce-rate-spark"></div>
						<div class="a360-stat" id="a360-stat-bounce-rate"></div>
					</dd>
					<dt>Avg. Time on Site</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-time-on-site-spark"></div>
						<div class="a360-stat" id="a360-stat-time-on-site"></div>
					</dd>
					<dt>% New Visits</dt>
					<dd>
						<div class="a360-stat-spark" id="a360-stat-new-visits-spark"></div>
						<div class="a360-stat" id="a360-stat-new-visits"></div>
					</dd>
				</dl>
			</div>
			<?php if (!$a360_has_key) : ?>
				<p>
					Email campaigns can't be shown because you haven't connected to a MailChimp account.
					<a href="<?php echo site_url('/wp-admin/options-general.php?page=analytics360.php');?>">Connect to or create a MailChimp account</a>.
				</p>
			<?php endif; ?>
		</div>
	</div>

	<div class="a360-box" id="a360-box-traffic-by-region">
		<div class="a360-box-header"><h3>Traffic By Region</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<div id="a360-geo-map"></div>
		</div>
	</div>
	<div class="a360-box half" id="a360-box-referring-traffic-overview">
		<div class="a360-box-header"><h3>Referring Traffic Overview</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<div id="a360-referring-traffic-overview-legend"></div>
			<div id="a360-referring-traffic-chart"></div>
		</div>
	</div>
	<div class="a360-box half" id="a360-box-list-growth">
		<div class="a360-box-header"><h3>List Growth</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<div id="a360-list-growth-chart"></div>
			<?php if (!$a360_has_key) : ?>
				<h4>Oops!</h4>
				<p>
					List growth can't be shown because you haven't connected to a MailChimp account.
					<a href="<?php echo site_url('/wp-admin/options-general.php?page=analytics360.php');?>">Connect to or create a MailChimp account</a>.
				</p>
			<?php else : ?>
				<?php if (count($a360_list_options)) : ?>
				<select id="a360-list-growth-list-id">
					<?php echo implode("\n", $a360_list_options); ?>
				</select>
				<?php else : ?>
					<h4>No Lists Found</h4>
				<?php endif; ?>
			<?php endif; ?>
		</div>
	</div>
	<div class="a360-box" id="a360-box-top-referrers">
		<div class="a360-box-header"><div class="a360-breadcrumbs"></div><h3>Top Referrers</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<div class="a360-table-container" id="a360-top-referrers"></div>
		</div>
	</div>
	<div class="a360-box" id="a360-box-top-content">
		<div class="a360-box-header"><div class="a360-breadcrumbs"></div><h3>Top Content</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<div class="a360-table-container" id="a360-top-content"></div>
		</div>
	</div>
	<div class="a360-box" id="a360-box-mc-content">
		<iframe frameborder="0" id="a360-mc-content" style="width:100%; height:180px;" src="http://www.mailchimp.com/wpa/wpa-ads.html"></iframe>
	</div>
	<div class="a360-box" id="a360-box-mailchimp-activity">
		<div class="a360-box-header"><h3>MailChimp Activity</h3><div class="a360-box-status"></div></div>
		<div class="a360-box-content">
			<?php 
				if ($a360_has_key) {
					a360_render_chimp_chatter();
				}
				else {
					?>
					<p>
						<a href="<?php site_url('/wp-admin/options-general.php?page=analytics360.php');?>">Connect to or create a MailChimp account</a> to show your MailChimp activity.
					</p>
					<?php
				}
			?>
		</div>
	</div>
	
<?php /*</div>*/?>
