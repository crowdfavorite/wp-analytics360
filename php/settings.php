
<p>
	This is version <span class="a360-version-num"><?php echo A360_VERSION;?></span>.
	<a href="http://wordpress.org/extend/plugins/analytics360/faq/">FAQ</a> | <a href="http://groups.google.com/group/analytics360-discussion">Feedback</a>
</p>
<p>Just <strong>two quick steps</strong> before you can view your Google Analytics and MailChimp stats in WordPress&hellip;</p>

<ol class="a360-connection-steps">
	<li>
		<ul class="a360-tabs">
			<li id="a360-create-account-tab">I need to create an account</li>
			<li id="a360-have-account-tab" class="a360-selected">I have an account</li>
		</ul>
		<h3 id="a360-connect-to-mailchimp-head" class="a360-subhead<?php echo ($a360_has_key ? ' complete' : ''); ?>">Connect to MailChimp</h3>
		<ul class="a360-tab-contents">
			<li id="a360-have-account-content">
				<?php if (isset($_GET['a360_mc_auth_error'])) {
					echo '
						<div class="a360-warning">
							<h3>Trouble! <strong>MailChimp authentication didn\'t work!</strong></h3>
					';
					echo a360_troubleshoot_message(stripslashes($_GET['a360_mc_auth_error']));
					echo '
						</div>
					';
				}
				?>
				<form id="a360_mc_login_form" name="a360-settings-form" action="<?php echo admin_url('options-general.php');?>" method="post" autocomplete="off">
					<input type="hidden" name="a360_action" value="update_mc_api_key" />
					<input type="hidden" name="a360_nonce" value="<?php echo a360_create_nonce('update_mc_api_key'); ?>" />
					<fieldset class="options">
						<p class="a360-want-key"<?php echo ($a360_has_key ? ' style="display:none;"' : '');?>>
							Enter your <a href="https://us1.admin.mailchimp.com/account/api-key-popup" target="_blank">API Key</a>. This key will power Analytics360&deg;.
						</p>
						<div class="option a360-want-key"<?php echo ($a360_has_key ? ' style="display:none;"' : '');?>>
							<label for="a360_api_key">API Key</label>
							<input type="text" size="32" value="<?php echo $a360_api_key;?>" id="a360_api_key" name="a360_api_key" />
						</div>
					</fieldset>
					<p class="submit a360-want-key" <?php echo ($a360_has_key ? ' style="display:none;"' : '');?>>
						<input type="submit" name="submit" value="<?php echo __('Submit', 'analytics360');?>" id="a360-submit-mc-userpass"/>
					</p>
				</form>
				
				<form id="a360-clear-mc-api-key" action="<?php echo admin_url('options-general.php?page=analytics360.php'); ?>" method="post" class="a360-has-key" <?php echo (!$a360_has_key ? ' style="display:none;"' : '');?>>
					<input type="hidden" name="a360_action" value="clear_mc_api_key" />
					<input type="hidden" name="a360_nonce" value="<?php echo a360_create_nonce('clear_mc_api_key'); ?>" />
					<p>
						<a id="generate-new-link" href="javascript:;">Connect to a different account</a>, 
						or just <input type="submit" value="Forget This API Key" class="button" />
					</p>
				</form>

				<script type="text/javascript">
					jQuery(document).ready(function() {
						jQuery('#generate-new-link').click(function() {
							jQuery('.a360-want-key').show();
							jQuery('.a360-has-key').hide();
							jQuery('#a360_api_key').val('');
						});
					});
				</script>

			</li>
			<li id="a360-create-account-content" style="display:none;">
				<iframe frameborder="0" style="width:950px; height:450px; margin:0 auto;" src="http://www.mailchimp.com/signup/wpa_signup/"></iframe>
			</li>
		</ul>
	</li>
	<li>
<?php
		if (empty($a360_ga_token)) {
			$authenticate_url = 'https://www.google.com/accounts/AuthSubRequest?'.build_query(array(
				'next' => site_url('wp-admin/options-general.php?a360_action=capture_ga_token'),
				'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
				'secure' => 0,
				'session' => 1
			));
		}
		else {
			$url = 'https://www.googleapis.com/analytics/v2.4/management/accounts/~all/webproperties/~all/profiles';
					
			$wp_http = a360_get_wp_http();
			$request_args = array(
				'headers' => a360_get_authsub_headers(),
				'sslverify' => false
			);
			$result = $wp_http->request(
				$url,
				$request_args
			);

			$connection_errors = array();
			if (is_wp_error($result)) {
				$connection_errors = $result->get_error_messages();
			}
			else {
				$http_code = $result['response']['code'];
				$ga_auth_error = '';
				if ($http_code != 200) {
					$ga_auth_error = $result['response']['code'].': '.$result['response']['message'];
					//$ga_auth_error = $result['body'];
				}
				else {
					$xml = new SimpleXMLElement($result['body']);
					$profiles = array();
					foreach($xml->entry as $entry) {
						$properties = array();
						$children = $entry->children('http://schemas.google.com/analytics/2009');
						foreach($children->property as $property) {
							$attr = $property->attributes();
							$properties[str_replace('ga:', '', $attr->name)] = strval($attr->value);
						}
						$properties['title'] = $properties['profileName'];
						$properties['updated'] = strval($entry->updated);
						$profiles[$properties['profileId']] = $properties;
					}
					if (count($profiles)) {
						global $a360_ga_profile_id;
						if (count($profiles) == 1) {
							// Using array_values helps prevent altering the base array.
							$item = array_shift(array_values($profiles));
							if ($a360_ga_profile_id != $item['profileId']) {
								if (update_option('a360_ga_profile_id', $item['profileId'])) {
									$a360_ga_profile_id = $item['profileId'];
								}
							}
						}
						else if (count($profiles) > 1) {
							$profile_options = array();
							foreach ($profiles as $id => $profile) {
								$profile_options[] = '<option value="'.$id.'"'.($a360_ga_profile_id == $id ? 'selected="selected"' : '').'>'.$profile['title'].'</option>';
							}
						}
					}
				}
			}
		}

?>
		<h3 id="a360-connect-to-google-head" class="a360-subhead<?php echo (!empty($a360_ga_token) ? ' complete' : '') ?>">Connect to Google Analytics</h3>

<?php 
	$config_warnings = a360_config_warnings();
	if (empty($a360_ga_token)) : // no token
		if (isset($_GET['a360_ga_token_capture_errors'])) {
			// when the attempt to get token fails. most likely point of failure initially.
			a360_show_ga_auth_error('Whoops! <strong>We did not get an authorization token back from Google</strong>.', $_GET['a360_ga_token_capture_errors']);
		}
		else if (!empty($config_warnings)) { // have config warnings only
			a360_warning_box('Possible Server Configuration Problem', null, $config_warnings);
		}
?>

		<p><strong>Authenticate with Google.</strong></p>
		<p>Follow this link to be taken to Google's authentication page. After logging in there, you will be returned to Analytics360&deg;.</p>
		<p><a href="<?php echo $authenticate_url; ?>">Begin Authentication</a></p>

<?php
	else : // token
		if (isset($_GET['a360_revoke_token_chicken_and_egg'])) {
			a360_warning_box(
				'<strong>You must have a valid token to revoke a token!</strong>', 
				$_GET['a360_revoke_token_chicken_and_egg'],
				'Bit of a chicken-and-egg problem, we know. Click the link below to forget this token and start over, if necessary.'
			);
		}
		else if (!empty($ga_auth_error)) {
			a360_show_ga_auth_error('Hmm. <strong>Something went wrong with your Google authentication!</strong>', $ga_auth_error);
		}
		else if (count($connection_errors)) { // have session token; couldn't connect to get profile list
			a360_show_ga_auth_error('Darn! <strong>You should have access to an account, but we couldn\'t connect to Google</strong>!', implode('</br>', $connection_errors));
		}
		else {
?>

		<strong>Yippee! We can do some Google analytics tracking!</strong>
		
		<?php if (count($profiles)) : ?>
		
			<p>
				You have <?php echo count($profiles); ?> profiles in your account. 
				Currently you're tracking 
				<strong><?php echo $profiles[$a360_ga_profile_id]['title']; ?></strong><?php echo (count($profiles) > 1 ? ', but you can change that if you\'d like.' :'.'); ?>
			</p>

			<?php if (count($profiles) > 1) : ?>
					<form action="<?php echo admin_url('options-general.php?page=analytics360.php'); ?>" method="post">
						<input type="hidden" name="a360_action" value="set_ga_profile_id" />
						<input type="hidden" name="a360_nonce" value="<?php echo a360_create_nonce('set_ga_profile_id'); ?>" />
						<label for="a360-profile-id-select">From now on track:</label>
						<select id="a360-profile-id-select" name="profile_id">
							<?php echo implode("\n", $profile_options); ?>
						</select>
						<input type="submit" class="button" value="This one!" />
					</form>
			<?php endif; ?>

		<?php else :  /* if (count($accounts)) */ ?>

			<p>
				You do not have any profiles associated with your Google Analytics account. Probably better
				<a href="https://www.google.com/analytics">head over there</a> and set one up!
			</p>

		<?php endif; /* if (count($accounts)) */ ?>

	<?php } /* if (!empty($ga_auth_error)) */ ?>
	
	<?php if (isset($_GET['a360_revoke_token_chicken_and_egg'])) : ?>
		<form action="<?php echo admin_url('options-general.php?page=analytics360.php'); ?>" method="post" class="a360-revoke-or-forget">
			<input type="hidden" name="a360_action" value="forget_ga_token" />
			<input type="hidden" name="a360_nonce" value="<?php echo a360_create_nonce('forget_ga_token'); ?>" />
			<a id="a360-revoke-ga-auth-link" href="javascript:;">Need to forget your Google Analytics authorization token?</a>
			<div id="a360-revoke-ga-auth-container" style="display:none;">
				<label for="a360-revoke-ga-auth">You may need to do this if access to this account has been revoked outside of Analytics360&deg;: </label>
				<input id="a360-revoke-ga-auth" class="button" type="submit" value="Forget My Token!"/>
			</div>
		</form>
	<?php else : ?>
		<form action="<?php echo admin_url('options-general.php?page=analytics360.php'); ?>" method="post" class="a360-revoke-or-forget">
			<input type="hidden" name="a360_action" value="revoke_ga_token" />
			<input type="hidden" name="a360_nonce" value="<?php echo a360_create_nonce('revoke_ga_token'); ?>" />
			<a id="a360-revoke-ga-auth-link" href="javascript:;">Want to revoke access to this analytics account?</a>
			<div id="a360-revoke-ga-auth-container" style="display:none;">
				<label for="a360-revoke-ga-auth">Press this button to revoke Analytics360&deg; access to your Google Analytics account: </label>
				<input id="a360-revoke-ga-auth" class="button" type="submit" value="Revoke!"/>
			</div>
		</form>
	<?php endif; ?>
	
	
	<?php
	if (!empty($config_warnings)) { // have config warnings, but we have a token
		a360_warning_box('Possible Server Configuration Problem', null, $config_warnings);
	}
	?>
	
	
<?php endif; /* if (empty($a360_ga_token)) */ ?>
	</li>
</ol>
<script type="text/javascript">
	jQuery(document).ready(function() {
		jQuery('.a360-tabs li').click(function() {
			var id = jQuery(this).attr('id');
			jQuery('.a360-tab-contents li').hide('fast');
			jQuery('#' + id.substring(0, id.indexOf('-tab')) + '-content').show('fast');
			jQuery(this).addClass('a360-selected').siblings().removeClass('a360-selected');
			return false;
		});
		jQuery('#a360-revoke-ga-auth-link').click(function() {
			jQuery('#a360-revoke-ga-auth-container').slideDown();
			return false;
		})
	});
</script>
