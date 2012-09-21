<?php
/*
Plugin Name: Analytics360
Plugin URI: http://www.mailchimp.com/wordpress_analytics_plugin/?pid=wordpress&source=website
Description: Allows you to pull Google Analytics and MailChimp data directly into your dashboard, so you can access robust analytics tools without leaving WordPress. Compliments of <a href="http://mailchimp.com/">MailChimp</a>.
Version: 1.3.0
Author: Crowd Favorite
Author URI: http://crowdfavorite.com
*/

// ini_set('display_errors', '1'); ini_set('error_reporting', E_ALL);

define('A360_VERSION', '1.3.0');

load_plugin_textdomain('analytics360');

// This code is not used within the plugin itself. It should be reviewed for removal. --ssm 2012-09-21
define('A360_FILE', plugin_dir_path(__FILE__).basename(__FILE__));

define('A360_PHP_COMPATIBLE', version_compare(phpversion(), '5', '>='));
if (!A360_PHP_COMPATIBLE) {
	trigger_error('Analytics 360&deg; requires PHP 5 or greater.', E_USER_ERROR);
}

function a360_admin_init() {
	global $a360_page, $pagenow;
	$a360_page = null;
	if (isset($_GET['page']) && $_GET['page'] == 'analytics360.php') {
		$a360_page = (
			$pagenow == 'options-general.php' ? 'settings' : (
				$pagenow == 'index.php' ? 'dashboard' : '' )
		);
	}
	
	if ($a360_page == 'dashboard') {
		header('X-UA-Compatible: IE=7');	// ask ie8 to behave like ie7 for the sake of vml
		require_once(trailingslashit(ABSPATH).'wp-includes/class-simplepie.php');
	}

	if ($a360_page == 'dashboard') {
		wp_enqueue_script('jquery');
		wp_enqueue_script('a360_admin_js', site_url('?a360_action=admin_js&a360_page='.$a360_page), array('jquery'));
		wp_enqueue_script('google_jsapi', 'http://www.google.com/jsapi');
	}
}
add_action('admin_init', 'a360_admin_init');

function a360_get_mcapi($username_or_apikey, $secure = false) {
	if (a360_MCAPI_is_compatible() && class_exists('MCAPI')) {
		// We can use the version of MCAPI already loaded
		return new MCAPI($username_or_apikey, $secure);
	}
	else {
		// We need to load our version if it has not been.
		if (!class_exists('A360_MCAPI')) {
			include_once(plugin_dir_path(__FILE__).'php/A360_MCAPI.class.php');
		}
		return new A360_MCAPI($username_or_apikey, $secure);
	}
}

function a360_admin_head() {
	global $a360_page, $a360_api_key, $a360_ga_token;
	if (!empty($a360_page)) {
		echo '
			<style> v\:* { behavior: url(#default#VML); } </style>
			<xml:namespace ns="urn:schemas-microsoft-com:vml" prefix="v" >
		';
		echo '
			<link rel="stylesheet" type="text/css" href="'.site_url('?a360_action=admin_css').'" media="screen" charset="utf-8" />
			<!--[if IE]>
				<link rel="stylesheet" href="'.site_url('?a360_action=admin_css_ie').'" type="text/css" media="screen" charset="utf-8" />
			<![endif]-->
		';
		if ($a360_page == 'dashboard' && !empty($a360_ga_token)) {
			echo '
				<script type="text/javascript">
					if (typeof google !== \'undefined\') {
						google.load("gdata", "1");
						google.load("visualization", "1", {"packages": ["areachart", "table", "piechart", "imagesparkline", "geochart", "columnchart"]});
					}
					a360BaseUrl = "'.trailingslashit(home_url()).'";
				</script>
			';
		}
	}

}
add_action('admin_head', 'a360_admin_head');

$a360_api_key = get_option('a360_api_key');
$a360_has_key = !empty($a360_api_key);

$a360_ga_token = get_option('a360_ga_token');
$a360_ga_profile_id = get_option('a360_ga_profile_id');

function a360_warn_on_plugin_page($plugin_file) {
	if (strpos($plugin_file, 'analytics360.php')) {
		global $a360_has_key, $a360_ga_token;
		$mc_setup = $a360_has_key;
		$ga_setup = (isset($a360_ga_token) && !empty($a360_ga_token));
		$message = '';
		if (!$mc_setup && !$ga_setup) {
			$message = '<strong>Note</strong>: Analytics360&deg; requires account authentication to work. <a href="options-general.php?page=analytics360.php">Go here to set everything up</a>, then start analyticalizing!';
		}
		else if (!$mc_setup) {
			$message = '<strong>Note</strong>: You <em>could</em> be doing more with Analytics360&deg! <a href="options-general.php?page=analytics360.php">Log in or set up your MailChimp account</a>!';
		}
		else if (!$ga_setup) {
			$message = '<strong>Note</strong>: Analytics360&deg; has to hook up to your Google Analytics account before it can do anything! <a href="options-general.php?page=analytics360.php">Start the authorization process here</a>!';
		}
		if (!empty($message)) {
			print('
				<tr class="plugin-update-tr">
					<td colspan="5" class="plugin-update">
						<div class="update-message">
						'.$message.'
						</div>
					</td>
				</tr>
			');
		}
	}
}
add_action('after_plugin_row', 'a360_warn_on_plugin_page');

// returns false only when we're not using our own MCAPI, 
// and the existing version is < 2.1.
function a360_MCAPI_is_compatible() {
	if (class_exists('MCAPI')) {
		$api = new MCAPI(null);
		return version_compare($api->version, '1.3', '=');
	}
	return true;
}

function a360_troubleshoot_message($error = '') {
	$result = '';
	if (!empty($error)) {
		$result .= '<p>The error message was: <span style="color:red;">'.htmlspecialchars($error).'</span>.</p>';
	}
	$result .= '
		<p>If you\'re having trouble getting up and running, you might try one of the following resources:</p>
		<ul>
			<li><a href="http://groups.google.com/group/analytics360-discussion">The Analytics360&deg; Google Group</a></li>
			<li><a href="http://wordpress.org/support/">WordPress Support Forums</a></li>
		</ul>
	';
	return $result;
}

function a360_check_config() {
	$curl_has_ssl = false;
	$php_has_ssl = false;
	$curl_exists = function_exists('curl_version');
	if ($curl_exists) {
		$curl_info = curl_version();
		if (isset($curl_info['protocols'])) {
			$curl_has_ssl = in_array('https', $curl_info['protocols']);
		}
		else {
			$curl_has_ssl = !empty($curl_info['ssl_version']);
		}
	}
	if (function_exists('stream_get_wrappers')) {
		$php_has_ssl = in_array('https', stream_get_wrappers());
	}
	return compact('curl_has_ssl', 'php_has_ssl', 'curl_exists');
}

function a360_warning_box($message, $errors, $extra) {
	echo '
		<div class="a360-warning">
			<h3>'.$message.'</h3>
	';
	if (!empty($errors)) {
		echo '
			<p>The error message was: <span style="color:#900;">'.htmlspecialchars($errors).'</span>.</p>
		';
	}
	
	echo $extra;
	
	echo a360_troubleshoot_message();
	echo '</div>';
}

function a360_config_warnings() {
	$config_status = a360_check_config();
	$config_warning = '';

	if ($config_status['curl_exists'] && !$config_status['curl_has_ssl']) {
		$config_warning .= '<li>The version of cURL running on this server does not support SSL.</li>';
	}
	else if (!$config_status['curl_exists'] && !$config_status['php_has_ssl']) {
		$config_warning .= '<li>The version of PHP running on this server does not support SSL.</li>';
	}

	if (!empty($config_warning)) {
		$config_warning = '
			<p>We just asked your server about a few things and there\'s a chance you\'ll have problems using Analytics360&deg;.</p>
			<ul>
				'.$config_warning.'
			</ul>
			<p>Analytics360&deg; requires an SSL-enabled transport to work with Google Analytics. You may wish to contact your hosting service or server administrator to ensure that this is possible on your configuration.</p>
		';
	}
	return $config_warning;
}

function a360_show_ga_auth_error($message, $errors = '') {
	$config_warnings = a360_config_warnings();
	a360_warning_box($message, $errors, $config_warnings);
}

function a360_request_handler() {
	if (!empty($_GET['a360_action']) && current_user_can('manage_options')) {
		switch ($_GET['a360_action']) {

			case 'admin_js':
				a360_admin_js();
			break;
			case 'admin_css_ie':
				header('Content-type: text/css');
				require('css/a360-ie.css');
				die();
			break;
			case 'admin_css':
				header('Content-type: text/css');
				require('css/datePicker.css');
				require('css/a360.css');
				die();
			break;
			case 'capture_ga_token':
				$args = array();
				parse_str($_SERVER['QUERY_STRING'], $args);

				$token = NULL;
				if (isset($args['token'])) {
					$wp_http = a360_get_wp_http();
					$request_args = array(
						'method' => 'GET',
						'headers' => a360_get_authsub_headers($args['token']),
						'sslverify' => false
					);
					$response = $wp_http->request(
						'https://www.google.com/accounts/AuthSubSessionToken',
						$request_args
					);

					$error_messages = array();
					if (is_wp_error($response)) {
						// couldn't connect
						$error_messages = $response->get_error_messages();
					}
					else if (is_array($response)) {
						$matches = array();
						$found = preg_match('/Token=(.*)/', $response['body'], $matches);
						if ($found) {
							$token = $matches[1];
							$result = update_option('a360_ga_token', $token);
						}
						else {
							// connected, but no token in response. 
							$error_messages = array($repsonse['body']);
						}
					}
				}

				if (!$token) {
					if (count($error_messages)) {
						$capture_errors .= implode("\n", $error_messages);
					}
					else {
						$capture_errors = 'unknown error';
					}
					$q = build_query(array(
						'a360_ga_token_capture_errors' => $capture_errors
					), '', '&');
				}
				else {
					delete_option('a360_ga_profile_id');
					$q = build_query(array(
						'updated' => true
					), '', '&');
				}
				wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&'.$q));
			break;
			case 'get_wp_posts':
				$start = (preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $_GET['start_date']) ? $_GET['start_date'] : '0000-00-00');
				$end = (preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $_GET['end_date']) ? $_GET['end_date'] : '0000-00-00');
				add_filter('posts_where', create_function(
					'$where', 
					'return $where." AND post_date >= \''.$start.'\' AND post_date < \''.$end.'\'";'
				));
				$results = query_posts('post_status=publish&posts_per_page=999');
				
				header('Content-type: text/javascript');
				die(cf_json_encode(array(
					'success' => true,
					'data' => $results,
					'cached' => false
				)));
			break;
			case 'get_mc_data':
				global $a360_api_key;
				$api = a360_get_mcapi($a360_api_key);
				switch ($_GET['data_type']) {
					case 'campaigns':
						$results = $api->campaigns(array(
							'sendtime_start' => $_GET['start_date'],
							'end_start' => $_GET['end_date']
						));
						if ($results) {
							die(cf_json_encode(array(
								'success' => true,
								'data' => $results['data'],
								'cached' => false
							)));
						}
						else if (empty($api->errorCode)) {
							die(cf_json_encode(array(
								'success' => true,
								'data' => $results,
								'cached' => false
							)));
						}
						else {
							die(cf_json_encode(array(
								'success' => false,
								'error' => $api->errorMessage
							)));
						}
					break;
					case 'list_growth':
						$results = $api->listGrowthHistory($_GET['list_id']);
						if ($results) {
							die(cf_json_encode(array(
								'success' => true,
								'data' => $results,
								'cached' => false
							)));
						}
						else {
							die(cf_json_encode(array(
								'success' => false,
								'error' => $api->errorMessage
							)));
						}
					break;
				}
			break;
			case 'get_ga_data':
				global $a360_ga_token, $a360_ga_profile_id;
				
				$parameters = array(
					'start-date' => $_GET['start_date'],
					'end-date' => $_GET['end_date'],
					'sort' => 'ga:date',
					'ids' => 'ga:'.$a360_ga_profile_id
				);

				// split up top referrals by filtering on each medium in turn
				if ($_GET['data_type'] == 'top_referrals') {
					$requests = array(
						'referral' => null,
						'organic' => null,
						'email' => null,
						'cpc' => null,
						'*' => null
					);
					$parameters['dimensions'] = 'ga:medium,ga:source';
					$parameters['metrics'] = 'ga:visits,ga:timeOnSite,ga:pageviews';
					$parameters['sort'] = '-ga:visits';

					$all_results = array();

					foreach ($requests as $filter => $request) {
						$p = ($filter == '*' ? array('max-results' => 200) : array('filters' => 'ga:medium=='.$filter, 'max-results' => 200));
						$requests[$filter] = $request = a360_get_wp_http();
						$all_results[$filter] = $request->request(
							'https://www.googleapis.com/analytics/v2.4/data?'.build_query(array_merge(
								$parameters,
								$p
							), '', '&'),
							array(
								'headers' => a360_get_authsub_headers(),
								'timeout' => 10,
								'sslverify' => false
							)
						);
					}

					foreach ($all_results as $filter => $results) {
						if (is_wp_error($results)) {
							header('Content-type: text/javascript');
							die(cf_json_encode(array(
								'success' => false,
								'error' => implode('<br/>', $results->get_error_messages())
							)));
						}
						if (substr($results['response']['code'], 0, 1) == '2') {
							$all_results[$filter] = a360_reportObjectMapper($results['body']);
						}
						else {
							header('Content-type: text/javascript');
							die(cf_json_encode(array(
								'success' => false,
								'error' => $results['body']
							)));
						}
					}
					
					header('Content-type: text/javascript');
					die(cf_json_encode(array(
						'success' => true,
						'data' => $all_results,
						'cached' => false
					)));

				}
				else {
					switch ($_GET['data_type']) {
						case 'visits':
							$parameters['dimensions'] = 'ga:date,ga:medium';
							$parameters['metrics'] = 'ga:visits,ga:bounces,ga:entrances,ga:pageviews,ga:newVisits,ga:timeOnSite';
							//$parameters['filters'] = 'ga:medium==referral,ga:medium==organic,ga:medium==email,ga:medium==cpc';
							//$parameters['sort'] = '-ga:visits';
						break;
						case 'geo':
							$parameters['dimensions'] = 'ga:country';
							$parameters['metrics'] = 'ga:visits';
							$parameters['sort'] = '-ga:visits';
						break;
						case 'top_referrals':
							$parameters['dimensions'] = 'ga:medium,ga:source';
							$parameters['metrics'] = 'ga:visits,ga:timeOnSite,ga:pageviews';
							$parameters['sort'] = '-ga:visits';
							$parameters['filters'] = 'ga:medium==referral,ga:medium==organic,ga:medium==email,ga:medium==cpc';
						break;
						case 'referral_media':
							$parameters['dimensions'] = 'ga:medium';
							$parameters['metrics'] = 'ga:visits';
							$parameters['sort'] = '-ga:visits';
						break;
						case 'top_content':
							$parameters['dimensions'] = 'ga:pagePath';
							$parameters['metrics'] = 'ga:pageviews,ga:uniquePageviews,ga:timeOnPage,ga:exits';
							$parameters['sort'] = '-ga:pageviews';
						break;
						case 'keywords':
							$parameters['dimensions'] = 'ga:keyword';
							$parameters['metrics'] = 'ga:pageviews,ga:uniquePageviews,ga:timeOnPage,ga:exits';
							$parameters['sort'] = '-ga:pageviews';
							$parameters['filters'] = 'ga:source=='.$_GET['source_name'];
						break;
						case 'referral_paths':
							$parameters['dimensions'] = 'ga:source,ga:referralPath';
							$parameters['metrics'] = 'ga:pageviews,ga:uniquePageviews,ga:timeOnPage,ga:exits';
							$parameters['sort'] = '-ga:pageviews';
							$parameters['filters'] = 'ga:source=='.$_GET['source_name'];
						break;
						case 'email_referrals':
							$parameters['dimensions'] = 'ga:campaign';
							$parameters['metrics'] = 'ga:pageviews,ga:uniquePageviews,ga:timeOnPage,ga:exits';
							$parameters['sort'] = '-ga:pageviews';
							$parameters['filters'] = 'ga:medium==email';
						break;
						default:
						break;
					}
					
					$wp_http = a360_get_wp_http();
					$url = 'https://www.google.com/analytics/feeds/data?'.build_query($parameters, '', '&');
				
					$request_args = array(
						'headers' => a360_get_authsub_headers(),
						'timeout' => 10,
						'sslverify' => false
					);
					$result = $wp_http->request(
						$url,
						$request_args
					);
				}


				if (is_wp_error($result)) {
					header('Content-type: text/javascript');
					die(cf_json_encode(array(
						'success' => false,
						'error' => implode('<br/>', $result->get_error_messages())
					)));
				}

				if (substr($result['response']['code'], 0, 1) == '2') {
					$result = a360_reportObjectMapper($result['body']);

					header('Content-type: text/javascript');
					die(cf_json_encode(array(
						'success' => true,
						'data' => $result,
						'cached' => false
					)));
				}
				else {
					header('Content-type: text/javascript');
					die(cf_json_encode(array(
						'success' => false,
						'error' => $result['body']
					)));
				}
			break;
		}
	}
	if (!empty($_POST['a360_action']) && current_user_can('manage_options')) {
		a360_check_nonce($_POST['a360_nonce'], $_POST['a360_action']);
		switch ($_POST['a360_action']) {
			case 'update_mc_api_key':
				if (!empty($_POST['a360_api_key']) && isset($_POST['a360_api_key'])) {
					$key_result = a360_validate_API_key($_POST['a360_api_key']);
				}
				if (!empty($key_result)) {
					if ($key_result['success']) {
						delete_option('a360_chimp_chatter_url');
						update_option('a360_api_key', $key_result['api_key']);
						$q = build_query(array('updated' => 'true'), '', '&');
					}
					else {
						$q = build_query(array('a360_mc_auth_error' => $key_result['error']), '', '&');
					}
				}
				wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&'.$q));
				die();
			break;
			case 'clear_mc_api_key':
				delete_option('a360_api_key');
				delete_option('a360_chimp_chatter_url');
				wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&'.build_query(array('updated' => 'true'), '', '&')));
			break;
			case 'revoke_ga_token':
				global $a360_ga_token;
				$wp_http = a360_get_wp_http();
				$request_args = array(
					'headers' => a360_get_authsub_headers(),
					'sslverify' => false
				);
				$response = $wp_http->request(
					'https://www.google.com/accounts/AuthSubRevokeToken',
					$request_args
				);
				if ($response['response']['code'] == 200) {
					delete_option('a360_ga_token');
					delete_option('a360_ga_profile_id');
					wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&update=true'));
				}
				else if ($response['response']['code'] == 403) {
					wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&'.build_query(array(
						'a360_revoke_token_chicken_and_egg' => $response['response']['code'].': '.$response['response']['message']
					), '', '&')));
				}
				else {
					if (is_wp_error($response)) {
						$errors = $response->get_error_messages();
					}
					else {
						$errors = array($response['response']['code'].': '.$response['response']['message']);
					}
					wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&'.build_query(array(
						'a360_error' => implode("\n", $errors)
					), '', '&')));
				}
			break;
			case 'forget_ga_token':
				delete_option('a360_ga_token');
				delete_option('a360_ga_profile_id');
				wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&update=true'));
			break;
			case 'set_ga_profile_id':
				if (update_option('a360_ga_profile_id', $_POST['profile_id'])) {
					wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&updated=true'));
				}
				else {
					wp_redirect(site_url('wp-admin/options-general.php?page='.basename(__FILE__).'&a360_error='.urlencode(__('Could not save Analytics profile information', 'analytics360'))));
				}
			break;
		}
	}
}
add_action('init', 'a360_request_handler');

function a360_check_nonce($nonce, $action_name) {
	if (wp_verify_nonce($nonce, $action_name) === false) {
		wp_die('The page with the command you submitted has expired. Please try again.');
	}
}
function a360_create_nonce($action_name) {
	return wp_create_nonce($action_name);
}

function a360_admin_js() {
	global $a360_api_key, $a360_has_key, $a360_ga_token;
	header('Content-type: text/javascript');
	
	if ((!isset($a360_ga_token) || empty($a360_ga_token)) && $_GET['a360_page'] == 'dashboard') {
		// some odd js errors happen if we don't actually have content on the dashboard page.
		die();
	}
	require('js/date-coolite.js');
	require('js/date.js');
	require('js/jquery.datePicker.js');
	require('js/jquery.datePickerMultiMonth.js');
	require('js/a360.js');
	
	$pageName = 'dashboard';
	if (in_array($_GET['a360_page'], array('dashboard', 'settings'))) {
		$pageName = $_GET['a360_page'];
	}
	print('
		(function() {
			a360.pageName = "'.$pageName.'";
			a360.mcAPIKey = "'.($a360_has_key ? $a360_api_key : '').'";
		})();
	');
	die();
}

/**
 * Formerly worked around a bug in WP 2.7's implementation of WP_Http 
 * running on cURL. Left in for legacy reasons, to remove in the future
 * after thorough testing.
 */
function a360_get_authsub_headers($token = null) {
	global $a360_ga_token;
	$token = (is_null($token) ? $a360_ga_token : $token);
	return array('Authorization' => 'AuthSub token="'.$token.'"');
}

function a360_admin_menu() {
	if (current_user_can('manage_options')) {
		add_options_page(
			__('Settings', 'analytics360'),
			__('Analytics360°', 'analytics360'),
			'manage_options',
			basename(__FILE__),
			'a360_settings_form'
		);
		add_dashboard_page(
			__('Dashboard', 'analytics360'),
			__('Analytics360°', 'analytics360'),
			'manage_options',
			basename(__FILE__),
			'a360_dashboard'
		);
	}
}
add_action('admin_menu', 'a360_admin_menu');

function a360_plugin_action_links($links, $file) {
	$plugin_file = basename(__FILE__);
	if (basename($file) == $plugin_file) {
		$settings_link = '<a href="options-general.php?page='.$plugin_file.'">'.__('Settings', 'analytics360').'</a>';
		array_unshift($links, $settings_link);
	}
	return $links;
}
add_filter('plugin_action_links', 'a360_plugin_action_links', 10, 2);

function a360_settings_form() {
	global $a360_api_key, $a360_has_key, $a360_ga_token;

	$notification = (
		isset($_GET['a360_error']) ? 
			'<span class="error" style="padding:3px;"><strong>Error</strong>: '.esc_html(stripslashes($_GET['a360_error'])).'</span>' : 
			''
	);
		
	include('php/header.php');
	include('php/settings.php');
	include('php/footer.php');
}

function a360_dashboard() {
	global $a360_api_key, $a360_ga_token, $a360_has_key;
	$notification = (
		isset($_GET['a360_error']) ? 
			'<span class="error" style="padding:3px;"><strong>Error</strong>: '.esc_html(stripslashes($_GET['a360_error'])).'</span>' : 
			''
	);
	
	$a360_list_options = array();
	
	if (!empty($a360_api_key)) {
		$api = a360_get_mcapi($a360_api_key);
		if (empty($api->errorCode)) {
			$lists = $api->lists();
			if (is_array($lists) && !empty($lists['data']) && is_array($lists['data'])) {
				foreach ($lists['data'] as $list) {
					$a360_list_options[] = '<option value="'.$list['id'].'">'.$list['name'].'</option>';
				}
			}
			else {
				$a360_list_options[] = '<option value="">Error: '.$api->errorMessage.'</option>';
			}
		}
		else {
			$a360_list_options[] = '<option value="">API Key Error: '.$api->errorMessage.'</option>';
		}
	}

	include('php/header.php');
	include('php/dashboard.php');
	include('php/footer.php');
}

function a360_render_chimp_chatter() {
	$rss = a360_get_chimp_chatter(10);
	if ($rss !== false) {
		echo '<ul id="chatter-messages">';
		foreach ((array)$rss->items as $item) {
			printf(
				'<li class="'.$item['category'].'"><a href="%1$s" title="%2$s">%3$s</a></li>',
				clean_url($item['link']),
				attribute_escape(strip_tags($item['description'])),
				$item['title']
			);
		}
		echo '</ul>';
	}
}

function a360_get_chimp_chatter($num_items = -1) {
	$url = a360_get_chimp_chatter_url();
	if ($url) {
		if ($rss = fetch_feed($url)) {	// intentional assignment
			if (!is_wp_error($rss)) {
				if ($num_items !== -1) {
					$rss->items = array_slice($rss->items, 0, $num_items);
				}
				return $rss;
			}
		}
	}
	return false;
}

function a360_get_chimp_chatter_url() {
	if ($url = get_option('a360_chimp_chatter_url')) {	// intentional assignment
		return $url;
	}
	global $a360_api_key;
	if (!empty($a360_api_key)) {
		$api = a360_get_mcapi($a360_api_key);
		if (!empty($api->errorCode)) {
			return null;
		}
		
		if (method_exists($api, 'getAccountDetails')) {
			$result = $api->getAccountDetails();
		}
		else {
			// this call is deprecated, but if user has an old version of MCAPI powering another MC plugin...
			$result = $api->getAffiliateInfo();
		}
		
		if (!empty($api->errorCode)) {
			return null;
		}
		
		// determine the right datacenter/endpoint
    	list($key, $dc) = explode('-', $api->api_key, 2);
    	if (!$dc) {
			$dc = 'us1'; 
		}
        $host = $dc.'.admin.mailchimp.com';

		$url = 'http://'.$host.'/chatter/feed?u='.$result['user_id'];
		update_option('a360_chimp_chatter_url', $url);
		return $url;
	}
}

// This functionality does not appear to be supported with the MCAPI v 1.3, and must be removed.
/*
function a360_fetch_API_key($username, $password) {
	$api = new MCAPI($username, $password, true);
	if ($api->errorCode) {
		return array(
			'success' => false,
			'error' => $api->errorMessage
		);
	}
	return array(
		'success' => true,
		'api_key' => $api->api_key
	);
}
*/

function a360_validate_API_key($key) {
	$api = a360_get_mcapi($key, true);
	$api->ping();
	if ($api->errorCode) {
		return array(
			'success' => false,
			'error' => $api->errorMessage
		);
	}
	return array(
		'success' => true,
		'api_key' => $api->api_key
	);
}

/**
 * Adapted from: 
 * 
 * GAPI - Google Analytics PHP Interface
 * http://code.google.com/p/gapi-google-analytics-php-interface/
 * @copyright Stig Manning 2009
 * @author Stig Manning <stig@sdm.co.nz>
 * @version 1.3
 */
function a360_reportObjectMapper($xml_string) {
	$xml = simplexml_load_string($xml_string);


	$results = null;
	$results = array();
	
	$report_root_parameters = array();
	$report_aggregate_metrics = array();
	
	//Load root parameters
	
	$report_root_parameters['updated'] = strval($xml->updated);
	$report_root_parameters['generator'] = strval($xml->generator);
	$report_root_parameters['generatorVersion'] = strval($xml->generator->attributes());
	
	$open_search_results = $xml->children('http://a9.com/-/spec/opensearchrss/1.0/');
	
	foreach($open_search_results as $key => $open_search_result) {
		$report_root_parameters[$key] = intval($open_search_result);
	}
	
	$google_results = $xml->children('http://schemas.google.com/analytics/2009');

	foreach($google_results->dataSource->property as $property_attributes) {
		$attr = $property_attributes->attributes();
		$report_root_parameters[str_replace('ga:','',$attr->name)] = strval($attr->value);
	}
	
	$report_root_parameters['startDate'] = strval($google_results->startDate);
	$report_root_parameters['endDate'] = strval($google_results->endDate);
	
	//Load result aggregate metrics
	
	foreach($google_results->aggregates->metric as $aggregate_metric) {
		$attr = $aggregate_metric->attributes();
		$metric_value = strval($attr->value);
		$name = $attr->name;
		//Check for float, or value with scientific notation
		if(preg_match('/^(\d+\.\d+)|(\d+E\d+)|(\d+.\d+E\d+)$/',$metric_value)) {
			$report_aggregate_metrics[str_replace('ga:','',$name)] = floatval($metric_value);
		}
		else {
			$report_aggregate_metrics[str_replace('ga:','',$name)] = intval($metric_value);
		}
	}
	
	//Load result entries
	
	foreach($xml->entry as $entry) {
		$metrics = array();
		$children = $entry->children('http://schemas.google.com/analytics/2009');
		foreach($children->metric as $metric) {
			$attr = $metric->attributes(); 
			$metric_value = strval($attr->value);
			$name = $attr->name;
			
			//Check for float, or value with scientific notation
			if(preg_match('/^(\d+\.\d+)|(\d+E\d+)|(\d+.\d+E\d+)$/',$metric_value)) {
				$metrics[str_replace('ga:','',$name)] = floatval($metric_value);
			}
			else {
				$metrics[str_replace('ga:','',$name)] = intval($metric_value);
			}
		}
		
		$dimensions = array();
		$children = $entry->children('http://schemas.google.com/analytics/2009');
		foreach($children->dimension as $dimension) {
			$attr = $dimension->attributes();
			$dimensions[str_replace('ga:','',$attr->name)] = strval($attr->value);
		}
		
		$results[] = array('metrics' => $metrics, 'dimensions' => $dimensions);
	}
		
	return $results;
}

if (!function_exists('get_snoopy')) {
	function get_snoopy() {
		include_once(ABSPATH.'/wp-includes/class-snoopy.php');
		return new Snoopy;
	}
}

function a360_get_wp_http() {
	if (!class_exists('WP_Http')) {
		include_once(ABSPATH.WPINC.'/class-http.php');
	}
	return new WP_Http();
}

/**
 * JSON ENCODE for PHP < 5.2.0
 * Checks if json_encode is not available and defines json_encode
 * to use php_json_encode in its stead
 * Works on iteratable objects as well - stdClass is iteratable, so all WP objects are gonna be iteratable
 */ 
if(!function_exists('cf_json_encode')) {
	function cf_json_encode($data) {
		if(function_exists('json_encode')) { return json_encode($data); }
		else { return cfjson_encode($data); }
	}
	
	function cfjson_encode_string($str) {
		if(is_bool($str)) { 
			return $str ? 'true' : 'false'; 
		}
	
		return str_replace(
			array(
				'"'
				, '/'
				, "\n"
				, "\r"
			)
			, array(
				'\"'
				, '\/'
				, '\n'
				, '\r'
			)
			, $str
		);
	}

	function cfjson_encode($arr) {
		$json_str = '';
		if (is_array($arr)) {
			$pure_array = true;
			$array_length = count($arr);
			for ( $i = 0; $i < $array_length ; $i++) {
				if (!isset($arr[$i])) {
					$pure_array = false;
					break;
				}
			}
			if ($pure_array) {
				$json_str = '[';
				$temp = array();
				for ($i=0; $i < $array_length; $i++) {
					$temp[] = sprintf("%s", cfjson_encode($arr[$i]));
				}
				$json_str .= implode(',', $temp);
				$json_str .="]";
			}
			else {
				$json_str = '{';
				$temp = array();
				foreach ($arr as $key => $value) {
					$temp[] = sprintf("\"%s\":%s", $key, cfjson_encode($value));
				}
				$json_str .= implode(',', $temp);
				$json_str .= '}';
			}
		}
		else if (is_object($arr)) {
			$json_str = '{';
			$temp = array();
			foreach ($arr as $k => $v) {
				$temp[] = '"'.$k.'":'.cfjson_encode($v);
			}
			$json_str .= implode(',', $temp);
			$json_str .= '}';
		}
		else if (is_string($arr)) {
			$json_str = '"'. cfjson_encode_string($arr) . '"';
		}
		else if (is_numeric($arr)) {
			$json_str = $arr;
		}
		else if (is_bool($arr)) {
			$json_str = $arr ? 'true' : 'false';
		}
		else {
			$json_str = '"'. cfjson_encode_string($arr) . '"';
		}
		return $json_str;
	}
}

?>
