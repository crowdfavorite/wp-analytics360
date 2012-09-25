
/**
 * a360.js
 * 
 * Javascript for MailChimp's Analytics360 WordPress plugin. See analytics360.php for license, readme, etc.
 */
;(function($) {
	window.a360 = {};

	if (!Function.prototype._cfBind) {
		Function.prototype._cfBind = function(obj) {
			var f = this;
			return (function() {
				return f.apply(obj, arguments);
			});
		};
	}

	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(elt /*, from*/) {
			var len = this.length;
			var from = Number(arguments[1]) || 0;
			from = (from < 0) ? Math.ceil(from) : Math.floor(from);
			if (from < 0)
				from += len;

			for (; from < len; from++) {
				if (from in this && this[from] === elt) return from;
			}
			return -1;
		};
	}

	if (!String.prototype.commaize && !Number.prototype.commaize) {
		String.prototype.commaize = Number.prototype.commaize = function() {
			nStr = this + '';
			x = nStr.split('.');
			x1 = x[0];
			x2 = x.length > 1 ? '.' + x[1] : '';
			var rgx = /(\d+)(\d{3})/;
			while (rgx.test(x1)) {
				x1 = x1.replace(rgx, '$1' + ',' + '$2');
			}
			return x1 + x2;
		};
	}

	a360.displayDates = {
		start: null,
		end: null,
		lastStart: null,
		lastEnd: null
	};
	
	a360.renderers = {
		vml: {
			setFillColor: function(element, color) {
				$(element).attr('fillcolor', color);
			},
			setStrokeColor: function(element, color) {
				$(element).get(0).stroked = true;
				$(element).get(0).strokecolor = color;
			},
			setStrokeWeight: function(element, weight) {
				$(element).get(0).stroked = true;
				$(element).get(0).strokeweight = weight;
			},
			setRadius: function(element, radius) {
				$(element).css({ width: (radius * 2), height: (radius * 2) });
			},
			setY: function(element, value) {
				$(element).css('top', value);
			},
			getDimensions: function(element) {
				return { width: parseFloat($(element).css('width')), height: parseFloat($(element).css('height')) };
			},
			getOffset: function(element) {
				return { top: parseFloat($(element).css('top')), left: parseFloat($(element).css('left')) };
			},
			getCenterOffset: function(circle) {
				var o = a360.gfx.getOffset(circle);
				var d = a360.gfx.getDimensions(circle);
				return { top: o.top + (d.height / 2), left: o.left + (d.width / 2) };
			},
			setAttribute: function(element, name, value) {
				$(element).get(0)[name] = value;
			},
			getAttribute: function(element, name) {
				return $(element).get(0)[name];
			},

			circleName: 'oval',
			renderer: 'vml'
		},
		svg: {
			setFillColor: function(element, color) {
				$(element).attr('fill', color);
			},
			setStrokeColor: function(element, color) {
				$(element).attr('stroke', color);
			},
			setStrokeWeight: function(element, weight) {
				$(element).attr('stroke-width', weight);
			},
			setRadius: function(element, radius) {
				$(element).attr('r', radius);
			},
			setY: function(element, value) {
				$(element).attr('cy', value);
			},
			getDimensions: function(element) {
				return { width: parseFloat($(element).get(0).getAttribute('width')), height: parseFloat($(element).get(0).getAttribute('height')) };
			},
			getOffset: function(element) {
				return { top: parseFloat($(element).get(0).getAttribute('y')), left: parseFloat($(element).get(0).getAttribute('x')) };
			},
			getCenterOffset: function(circle) {
				return { top: parseFloat(a360.gfx.getAttribute(circle, 'cy')), left: parseFloat(a360.gfx.getAttribute(circle, 'cx'))  };
			},
			setAttribute: function(element, name, value) {
				$(element).get(0).setAttribute(name, value);
			},
			getAttribute: function(element, name) {
				return $(element).get(0).getAttribute(name);
			},
			circleName: 'circle',
			renderer: 'svg'
		}
	};
	
	// Will be one of the renderer objects above once we determine which 
	// engine we're working with.
	a360.gfx = null;
	
	a360.easeOut = function (frame, start, delta, nFrames) {
		return -delta * (frame /= nFrames) * (frame - 2) + start;
	};
	
	a360.animateLineChart = function(startCoords, endCoords, frame, nFrames) {
		var chartLine = null;
		var chartFill = null;
		
		if (a360.gfx.renderer == 'svg') {
			var chartLine = $('path[stroke="#92BCD0"]');
			var chartFill = $('path[fill="#92BCD0"]');
		}
		else {
			var nShapes = $('shape').size();
			var chartLine = $('shape:eq(' + (nShapes - 1) + ') path');
			var chartFill = $('shape:eq(' + (nShapes - 2) + ') path');
		}

		var interpValues = $.map(startCoords, function(coord, i) {
			return { 
				x: coord.x, 
				y: a360.easeOut(frame, startCoords[i].y, endCoords[i].y - startCoords[i].y, nFrames)
			};
		});
		a360.lineChart.jqCircles.each(function(index) {
			a360.gfx.setY(this, (a360.gfx.renderer == 'svg' ? 
				interpValues[index].y : 
				Math.round(interpValues[index].y - (a360.gfx.getDimensions(this).height / 2)))
			);
		});
		
		if (a360.gfx.renderer == 'svg') {
			var d = 'M' + interpValues[0].x + ',' + interpValues[0].y;
			$.each(interpValues, function(i, coord) {
				d += 'L' + coord.x + ',' + coord.y;
			});

			a360.gfx.setAttribute(chartLine, 'd', d);
			d += 'L' + interpValues[interpValues.length - 1].x + ',' + (a360.lineChart.height + a360.lineChart.offsetY);
			d += 'L' + interpValues[0].x + ',' + (a360.lineChart.height + a360.lineChart.offsetY);
			a360.gfx.setAttribute(chartFill, 'd', d);
		}
		else {
			// vml freaks out if you give it floats - rounding solves this but creates minor visual offsets
			var d = 'm ' + Math.round(interpValues[0].x) + ',' + Math.round(interpValues[0].y);
			d += ' l ';
			$.each(interpValues, function(i, coord) {
				d += Math.round(coord.x) + ',' + Math.round(coord.y) + ' ';
			});
			a360.gfx.setAttribute(chartLine, 'v', d + ' e');
			d += Math.round(interpValues[interpValues.length - 1].x) + ',' + Math.round(a360.lineChart.height + a360.lineChart.offsetY) + ' ';
			d += Math.round(interpValues[0].x) + ',' + Math.round(a360.lineChart.height + a360.lineChart.offsetY);
			a360.gfx.setAttribute(chartFill, 'v', d + ' x');
		}
	};
	
	a360.handleDashboardReady = function() {
		var jqA360 = $(a360);
		jqA360.bind('fetchingGAVisits', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'loading'); });
		jqA360.bind('gaVisitsFetched', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'normal'); });
		jqA360.bind('gaVisitsFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-site-traffic'), 'Could not fetch visit data: ' + error); });
		jqA360.bind('gaVisitsFetched', a360.updateVisitsChart._cfBind(a360));

		jqA360.bind('mediumFilterChanged', a360.updateVisitStats._cfBind(a360));

		// geo map
		jqA360.bind('fetchingGAGeo', function() { a360.setHeaderStatus($('#a360-box-traffic-by-region'), 'loading'); });
		jqA360.bind('gaGeoFetched', function() { a360.setHeaderStatus($('#a360-box-traffic-by-region'), 'normal'); });
		jqA360.bind('gaGeoFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-traffic-by-region'), 'Could not fetch geo data: ' + error); });
		jqA360.bind('gaGeoFetched', a360.updateMap._cfBind(a360));
		
		// pie chart
		jqA360.bind('fetchingGAReferralMedia', function() { a360.setHeaderStatus($('#a360-box-referring-traffic-overview'), 'loading'); });
		jqA360.bind('gaReferralMediaFetched', function() { a360.setHeaderStatus($('#a360-box-referring-traffic-overview'), 'normal'); });
		jqA360.bind('gaReferralMediaFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-referring-traffic-overview'), 'Could not fetch referral data: ' + error); });
		jqA360.bind('gaReferralMediaFetched', a360.updateReferralMediumChart._cfBind(a360));
	
		// wp posts
		jqA360.bind('fetchingWPPosts', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'loading'); });
		jqA360.bind('wpPostsFetched', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'normal'); });
		jqA360.bind('wpPostsFetched', function() { $('#a360-linechart-legend li.blog-post').show('fast'); });
		jqA360.bind('wpPostsFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-site-traffic'), 'Could not fetch WordPress post data: ' + error); });
		jqA360.bind('wpPostsFetched', a360.updateVisitsChartWithPosts._cfBind(a360));

		if (a360.mcAPIKey.length) {
			jqA360.bind('fetchingMCCampaigns', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'loading'); });
			jqA360.bind('mcCampaignsFetched', function() { a360.setHeaderStatus($('#a360-box-site-traffic'), 'normal'); });
			jqA360.bind('mcCampaignsFetched', function() { $('#a360-linechart-legend li.campaign').show('fast'); });
			jqA360.bind('mcCampaignsFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-site-traffic'), 'Could not fetch MailChimp campaign data: ' + error); });
			jqA360.bind('mcCampaignsFetched', a360.updateVisitsChartWithCampaigns._cfBind(a360));
			
			
			jqA360.bind('fetchingMCListGrowth', function() { a360.setHeaderStatus($('#a360-box-list-growth'), 'loading'); });
			jqA360.bind('mcListGrowthFetched', function() { a360.setHeaderStatus($('#a360-box-list-growth'), 'normal'); });
			jqA360.bind('mcListGrowthFetchFailed', function(event, listID, error) { a360.addHeaderError($('#a360-box-list-growth'), 'Could not fetch MailChimp list data: ' + error); });
			jqA360.bind('mcListGrowthFetched', a360.updateListGrowth._cfBind(a360));
		}

		// top referrals table
		jqA360.bind('fetchingGATopReferrals', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'loading'); });
		jqA360.bind('gaTopReferralsFetched', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'normal'); });
		jqA360.bind('gaTopReferralsFetchFailed', function(event, error) { a360.addHeaderError($('#a360-box-top-referrers'), 'Could not fetch referral data: ' + error); });
		jqA360.bind('gaTopReferralsFetched', a360.updateTopReferrersChart._cfBind(a360));
		
		jqA360.bind('fetchingGAKeywords', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'loading'); });
		jqA360.bind('gaKeywordsFetched', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'normal'); });
		jqA360.bind('gaKeywordsFetchFailed', function(event, sourceName, error) { a360.addHeaderError($('#a360-box-top-referrers'), 'Could not fetch keyword data: ' + error); });
		jqA360.bind('gaKeywordsFetched', a360.handleKeywordsFetched._cfBind(a360));
		
		jqA360.bind('fetchingGAEmailReferrals', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'loading'); });
		jqA360.bind('gaEmailReferralsFetched', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'normal'); });
		jqA360.bind('gaEmailReferralsFetchFailed', function(event, sourceName, error) { a360.addHeaderError($('#a360-box-top-referrers'), 'Could not fetch email referral data: ' + error); });
		jqA360.bind('gaEmailReferralsFetched', a360.handleEmailReferralsFetched._cfBind(a360));

		
		jqA360.bind('fetchingGAReferralPaths', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'loading'); });
		jqA360.bind('gaReferralPathsFetched', function() { a360.setHeaderStatus($('#a360-box-top-referrers'), 'normal'); });
		jqA360.bind('gaReferralPathsFetchFailed', function(event, sourceName, error) { a360.addHeaderError($('#a360-box-top-referrers'), 'Could not fetch referral paths: ' + error); });
		jqA360.bind('gaReferralPathsFetched', a360.handleReferralPathsFetched._cfBind(a360));
		
		// top content table
		jqA360.bind('fetchingGATopContent', function() { a360.setHeaderStatus($('#a360-top-content'), 'loading'); });
		jqA360.bind('gaTopContentFetched', function() { a360.setHeaderStatus($('#a360-top-content'), 'normal'); });
		jqA360.bind('gaTopContentFetchFailed', function(event, error) { a360.addHeaderError($('#a360-top-content'), 'Could not fetch top content data: ' + error); });
		jqA360.bind('gaTopContentFetched', a360.updateTopContentChart._cfBind(a360));

		
		
		// display date change triggers other stuff
		jqA360.bind('displayDatesChanged', function(event, start, end) {
			a360.clearTableStack(jQuery('#a360-top-referrers'));
			a360.clearTableStack(jQuery('#a360-top-content'));
			a360.fetchGAVisits();
			a360.fetchGAGeo();
			a360.fetchGATopReferrals();
			a360.fetchGAReferralMedia();
			a360.fetchGATopContent();
		});
		
		var selectDateRange = function(start, end) {
			if (start.equals(a360.displayDates.start) && end.equals(a360.displayDates.end)) {
				return;
			}
			
			var jqdp = $('#a360-datepicker-calendars');
			jqdp.dpmmClearSelected();
			
			var d = new Date(end.valueOf());
			var nDays = 0;
			while (d.isAfter(start) || d.equals(start)) {				// this is a bit pricey
				jqdp.dpmmSetSelected(d.toString('dd/MM/yyyy'));
				d.addDays(-1);
				nDays++;
			}
			
			a360.displayDates.start = start;
			a360.displayDates.end = end;

			var startInputVal = new Date($('#a360-current-start-date input').val().replace(/-/g, '/'));
			var endInputVal = new Date($('#a360-current-end-date input').val().replace(/-/g, '/'));

			if (isNaN(startInputVal.valueOf()) || !(startInputVal.equals(start))) {
				$('#a360-datepicker-start-date').val(start.toString('yyyy-MM-dd'));
			}
			if (isNaN(endInputVal.valueOf()) || !(endInputVal.equals(end))) {
				$('#a360-datepicker-end-date').val(end.toString('yyyy-MM-dd'));
			}

			$('#a360-current-start-date span').html(start.toString('MMM dd, yyyy'));
			$('#a360-current-end-date span').html(end.toString('MMM dd, yyyy'));

			$('#a360-current-start-date input').val(start.toString('MMM dd, yyyy'));
			$('#a360-current-end-date input').val(end.toString('MMM dd, yyyy'));

			$('#a360-current-date-range-desc').html(nDays + ' day' + (nDays > 1 ? 's' : '') + ' selected');
		};

		var toggleDatePopup = function() {
			if ($('#a360-datepicker-popup').hasClass('open')) {
				$('#a360-datepicker-pane').slideUp();
				$('#a360-datepicker-popup').removeClass('open');

				$('#a360-current-date-range input').hide();
				$('#a360-current-date-range span').show();
				
				if (!a360.displayDates.lastStart || !a360.displayDates.lastEnd || 
					!a360.displayDates.lastStart.equals(a360.displayDates.start) || 
					!a360.displayDates.lastEnd.equals(a360.displayDates.end)
				) {
					a360.displayDates.lastStart = a360.displayDates.start;
					a360.displayDates.lastEnd = a360.displayDates.end;
					$(a360).trigger('displayDatesChanged', [a360.displayDates.start, a360.displayDates.end]);
				}
			}
			else {
				$('#a360-datepicker-popup').addClass('open');
				$('#a360-datepicker-pane').slideDown();

				$('#a360-current-date-range input').show();
				$('#a360-current-date-range span').hide();
			}
		};

		var buildDatepicker = function() {
			if (!$('#a360-datepicker-popup').data('datepicker')) {
				var dpmm = $('#a360-datepicker-calendars').datePickerMultiMonth({
					numMonths: 2,
					inline: true,
					selectMultiple: true,
					startDate: '01/01/2000',
					endDate: Date.today().toString('dd/MM/yyyy'),
					renderCallback: function(jqCell, date, m, y) {
						var element = jqCell.get(0);
						element.onselectstart = function() {
							return false;
						};
						element.unselectable = "on";
						element.style.MozUserSelect = "none";

						jqCell.click(function(event) {
							if (event.shiftKey) {
								if (date.isBefore(a360.displayDates.start)) {
									selectDateRange(date, a360.displayDates.end);
								}
								else if (date.isAfter(a360.displayDates.start)) {
									selectDateRange(a360.displayDates.start, date);
								}
								else if (date.between(a360.displayDates.start, a360.displayDates.end)) {
									if (date.valueOf() - a360.displayDates.start.valueOf() > a360.displayDates.end.valueOf() - date.valueOf()) {
										selectDateRange(date, a360.displayDates.end);
									}
									else {
										selectDateRange(a360.displayDates.start, date);
									}
								}
							}
							else {
								if (a360.displayDates.start.equals(a360.displayDates.end)) {
									selectDateRange(a360.displayDates.start, date);
								}
								else {
									selectDateRange(date, date);
								}
							}
						});
					}
				});
				$('#a360-datepicker-calendars').data('datepicker', dpmm);
			}
		};

		$('#a360-datepicker-popup')
			.hover(function(){ $('#a360-datepicker-popup').addClass('hover'); }, function() { $('#a360-datepicker-popup').removeClass('hover'); })
			.click(function(event) {
				if (event.target.nodeName.toLowerCase() == 'input') {
					return true;
				}
				toggleDatePopup();
			});
		$('#a360-current-start-date input, #a360-current-end-date input').keydown(function() {
			clearTimeout($(this).data('idleTimer'));
			$(this).data('idleTimer', setTimeout((function() {
				var d = new Date($(this).val().replace(/-/g, '/'));
				if (isNaN(d.valueOf())) {
					$(this).addClass('invalid');
				}
				else {
					$(this).removeClass('invalid');
				}
				if ($('input.invalid', $(this).parent()).size() == 0) {
					selectDateRange(
						new Date($('#a360-current-start-date input').val().replace(/-/g, '/')), 
						new Date($('#a360-current-end-date input').val().replace(/-/g, '/'))
					);
				}
			})._cfBind(this), 500));
		});
		$('#a360-apply-date-range').click(function() {
			toggleDatePopup();
		});

		buildDatepicker();
		selectDateRange(Date.today().addMonths(-1), Date.today().addDays(-1));

		// kick it off
		jqA360.trigger('displayDatesChanged', [a360.displayDates.start, a360.displayDates.end]);
		
		if (jQuery('#a360-list-growth-list-id').size()) {
			jQuery('#a360-list-growth-list-id').change(function() {
				a360.fetchMCListGrowth(jQuery('#a360-list-growth-list-id').val());
			});
			jQuery('#a360-list-growth-list-id').trigger('change');
		}
	};
		
	a360.updateVisitStats = function(event, medium) {
		
		$('#a360-stat-visits').html(a360.visitStats.mediumSummaries[medium].totalVisits.commaize());
		$('#a360-stat-pageviews').html(a360.visitStats.mediumSummaries[medium].totalPageviews.commaize());
		$('#a360-stat-pages-per-visit').html(a360.visitStats.mediumSummaries[medium].totalPagesPerVisit.commaize());
		$('#a360-stat-bounce-rate').html(a360.visitStats.mediumSummaries[medium].bounceRate);
		$('#a360-stat-time-on-site').html(a360.visitStats.mediumSummaries[medium].avgTimeOnSite);
		$('#a360-stat-new-visits').html(a360.visitStats.mediumSummaries[medium].percentNewVisits);
		$('.a360-stats-list').slideDown();

		$.each({
			'a360-stat-visits-spark': a360.visitStats.mediumSummaries[medium].visits,
			'a360-stat-pageviews-spark': a360.visitStats.mediumSummaries[medium].pageviews,
			'a360-stat-pages-per-visit-spark': a360.visitStats.mediumSummaries[medium].pagesPerVisit,
			'a360-stat-bounce-rate-spark': a360.visitStats.mediumSummaries[medium].bounceRates,
			'a360-stat-time-on-site-spark': a360.visitStats.mediumSummaries[medium].timeOnSite,
			'a360-stat-new-visits-spark': a360.visitStats.mediumSummaries[medium].newVisits
		}, function(id, filteredData) {
			var table = new google.visualization.DataTable();
			var spark = new google.visualization.ImageSparkLine($('#' + id).empty().get(0));
			table.addColumn('number', id);
			table.addRows(filteredData.length);
			$.each(filteredData, function(i, value) {
				table.setValue(i, 0, value);
			});
			spark.draw(table, { 
				width: 70, 
				height: 30, 
				showAxisLines: false, 
				showValueLabels: false, 
				labelPosition: 'none'
			});
		});
	};
		
	a360.updateMap = function(event, data) {
		var table = new google.visualization.DataTable();
		table.addColumn('string', 'Country');
		table.addColumn('number', 'Visits');
		var rows = [];
		$.each(data, function(i, datum) {
			rows.push({ country: datum.dimensions.country, visits: datum.metrics.visits });
		});
		table.addRows(rows.length);
		$.each(rows, function(i, row) {
			table.setValue(i, 0, row.country);
			table.setValue(i, 1, parseInt(row.visits, 10));
		});
		$('#a360-geo-map, #a360-box-traffic-by-region .a360-box-content').css({"height": "450px"});
		var geochart = new google.visualization.GeoChart($('#a360-geo-map').empty().get(0));
		geochart.draw(table, { dataMode: 'regions', backgroundColor: '#EAF7FE', width:'600px', colors: ['#C1D8EC', '#D98E26'] });
	};
		
	a360.updateReferralMediumChart = function(event, data) {
		var table = new google.visualization.DataTable();
		table.addColumn('string', 'Medium');
		table.addColumn('number', 'Visits');
		var rows = [];
		var media = {};
		var nMedia = 0;
		var totalVisits = 0;

		$.each(data, function(i, row) {
			
			var medium = 'other';
			//var medium = row.dimensions.medium;
			switch (row.dimensions.medium) {
				case '(none)':
				case '(not set)':
					medium = 'direct traffic';
				break;
				case 'referral':
					medium = 'referring traffic';
				break;
				case 'email':
					medium = 'email campaigns';
				break;
				case 'organic':
					medium = 'search engines';
				break;
			}
			
			if (media[medium]) {
				media[medium] += row.metrics.visits;
			}
			else {
				media[medium] = row.metrics.visits;
				nMedia++;
			}
			totalVisits += row.metrics.visits;
		});
		
		table.addRows(nMedia);
		
		var i = 0;
		var legendText = [];
		var colors = ['#5D83AD', '#91AFD1', '#BDD2EF', '#1b4065', '#777777'];
		
		$.each(media, function(medium, visits) {
			table.setValue(i, 0, medium);
			table.setValue(i, 1, visits);
			legendText.push('\
				<li>\
					<div class="a360-color-swatch" style="background:' + colors[i] + '"></div><strong>' + medium + '</strong>\
					<div>' + visits.commaize() + ' (' + ((100 * visits / totalVisits).toPrecision(2)) + '%)</div>\
				</li>\
			');
			i++;
		});
		var d = $('#a360-box-referring-traffic-overview').width() * 0.45;
		$('#a360-referring-traffic-chart').width(d).css('padding-top', Math.min(d * .3, 40));
		var piechart = new google.visualization.PieChart($('#a360-referring-traffic-chart').empty().get(0));
		piechart.draw(table, { 
			is3D:false, 
			legend: 'none', 
			width: d, 
			height: d,
			legendFontSize:14,
			legendTextColor:'#777777',
			colors: colors 
		});
		$('#a360-referring-traffic-overview-legend').html('\
			<ul>\
				' + legendText.join("\n") + '\
			</ul>\
		').css('left', d + (d * .2) + 'px');
	};
		
	a360.updateTopReferrersChart = function(event, data) {
		var dataTable = new google.visualization.DataTable();
		dataTable.addColumn('string', 'Source/Medium');
		dataTable.addColumn('number', 'Visits');
		dataTable.addColumn('number', 'Pages/Visit');
		dataTable.addColumn('string', 'Avg. Time on Site');
		var rows = [];
		var media = {};
		var nRows = 0;
		//console.dir(data);
		// our code on the server runs a separate request to google for each medium
		$.each(data, function(medium, referrals) {
			if (!referrals || typeof referrals != 'object' || !('length' in referrals)) {
				return true;
			}
			$.each(referrals, function(i, row) {
				var key = row.dimensions.source + ' / ' + row.dimensions.medium;

				if (media[key]) {
					media[key].visits += row.metrics.visits;
					media[key].pagesPerVisit += row.metrics.visits ? (row.metrics.pageviews / row.metrics.visits) : 0;
					media[key].timeOnSite += row.metrics.timeOnSite;
				}
				else {
					media[key] = {};
					if (row.dimensions.medium == 'organic' || row.dimensions.medium == 'cpc') {
						media[key].markup = '<a title="Show Top Keywords from ' + row.dimensions.source.replace(/\"/, '\'') + '" href="javascript:a360.fetchGAKeywords(\'' + row.dimensions.source + '\');">' + row.dimensions.source + ' / ' + row.dimensions.medium + '</a>';
					}
					else if (row.dimensions.medium == 'referral') {
						media[key].markup = '<a title="Show Top Referring Paths from ' + row.dimensions.source.replace(/\"/, '\'') + '" href="javascript:a360.fetchGAReferralPaths(\'' + row.dimensions.source + '\');">' + row.dimensions.source + ' / ' + row.dimensions.medium + '</a>';
					}
					else if (row.dimensions.medium == 'email') {
						media[key].markup = '<a title="Show Top Email Campaigns" href="javascript:a360.fetchGAEmailReferrals(\'' + row.dimensions.source + '\');">' + row.dimensions.source + ' / ' + row.dimensions.medium + '</a>';
					}
					else {
						media[key].markup = '<a title="Show Top Referring Paths from ' + row.dimensions.source.replace(/\"/, '\'') + '" href="javascript:a360.fetchGAReferralPaths(\'' + row.dimensions.source + '\');">' + row.dimensions.source.replace(/\"/, '\'') + ' / ' + row.dimensions.medium + '</a>';
					}
					media[key].visits = row.metrics.visits;
					media[key].pagesPerVisit = row.metrics.visits ? (row.metrics.pageviews / row.metrics.visits) : 0;
					media[key].timeOnSite = row.metrics.timeOnSite;
					nRows++;
				}
			});
		});

		$.each(media, function(id, row) { row.timeOnSite = a360.secToDuration(row.visits ? Math.round((row.timeOnSite) / row.visits) : 0); });

		dataTable.addRows(nRows);
		var i = 0;
		$.each(media, function(medium, row) {
			dataTable.setValue(i, 0, row.markup);
			dataTable.setValue(i, 1, row.visits);
			dataTable.setValue(i, 2, parseFloat(row.pagesPerVisit.toPrecision(3)));
			dataTable.setValue(i, 3, row.timeOnSite);
			i++;
		});
		a360.pushTable(jQuery('#a360-top-referrers'), dataTable, 'Top Referrers');
	};
		
	a360.handleKeywordsFetched = function(event, data, sourceName) {
		var keywordData = new google.visualization.DataTable();
		keywordData.addColumn('string', 'Keyword');
		keywordData.addColumn('number', 'Pageviews');
		keywordData.addColumn('number', 'Unique Pageviews');
		keywordData.addColumn('string', 'Avg. Time on Page');
		
		keywordData.addRows(data.length);
		
		$.each(data, function(i, row) {
			keywordData.setValue(i, 0, row.dimensions.keyword);
			keywordData.setValue(i, 1, row.metrics.pageviews);
			keywordData.setValue(i, 2, row.metrics.uniquePageviews);
			
			keywordData.setValue(i, 3, 
				a360.secToDuration(Math.round(row.metrics.timeOnPage / (row.metrics.pageviews - row.metrics.exits)))
			);
		});
		
		a360.pushTable(jQuery('#a360-top-referrers'), keywordData, 'Keywords from ' + sourceName);
	};
	
	a360.handleReferralPathsFetched = function(event, data, sourceName) {
		var keywordData = new google.visualization.DataTable();
		keywordData.addColumn('string', 'Referring Page');
		keywordData.addColumn('number', 'Pageviews');
		keywordData.addColumn('number', 'Unique Pageviews');
		keywordData.addColumn('string', 'Avg. Time on Page');
		
		keywordData.addRows(data.length);
		
		$.each(data, function(i, row) {
			keywordData.setValue(i, 0, '<a class="a360-outgoing" href="http://' + row.dimensions.source + row.dimensions.referralPath + '">' + row.dimensions.referralPath + '</a>');
			keywordData.setValue(i, 1, row.metrics.pageviews);
			keywordData.setValue(i, 2, row.metrics.uniquePageviews);
			keywordData.setValue(i, 3, 
				a360.secToDuration((row.metrics.pageviews - row.metrics.exits) > 0 ? Math.round(row.metrics.timeOnPage / (row.metrics.pageviews - row.metrics.exits)) : 0)
			);
		});
		
		a360.pushTable(jQuery('#a360-top-referrers'), keywordData, 'Referring Paths from ' + sourceName);
	};
	a360.handleEmailReferralsFetched = function(event, data, sourceName) {
		var keywordData = new google.visualization.DataTable();
		keywordData.addColumn('string', 'Campaign');
		keywordData.addColumn('number', 'Pageviews');
		keywordData.addColumn('number', 'Unique Pageviews');
		keywordData.addColumn('string', 'Avg. Time on Page');
		
		keywordData.addRows(data.length);
		
		$.each(data, function(i, row) {
			keywordData.setValue(i, 0, row.dimensions.campaign);
			keywordData.setValue(i, 1, row.metrics.pageviews);
			keywordData.setValue(i, 2, row.metrics.uniquePageviews);
			keywordData.setValue(i, 3, 
				a360.secToDuration((row.metrics.pageviews - row.metrics.exits) > 0 ? Math.round(row.metrics.timeOnPage / (row.metrics.pageviews - row.metrics.exits)) : 0)
			);
		});
		
		a360.pushTable(jQuery('#a360-top-referrers'), keywordData, 'Email Campaigns');
	};
	
	a360.updateTopContentChart = function(event, data) {
		var contentData = new google.visualization.DataTable();
		contentData.addColumn('string', 'Page');
		contentData.addColumn('number', 'Pageviews');
		contentData.addColumn('number', 'Unique Pageviews');
		contentData.addColumn('string', 'Avg. Time on Page');
		
		contentData.addRows(data.length);
		
		var secs = 0;
		$.each(data, function(i, row) {
			contentData.setValue(i, 0, '<a class="a360-outgoing" href="' + row.dimensions.pagePath + '">' + row.dimensions.pagePath + '</a>');
			contentData.setValue(i, 1, row.metrics.pageviews);
			contentData.setValue(i, 2, row.metrics.uniquePageviews);
			if (row.metrics.pageviews - row.metrics.exits > 0) {
				secs = Math.round(row.metrics.timeOnPage / (row.metrics.pageviews - row.metrics.exits));
			}
			else {
				secs = 0;
			}
			contentData.setValue(i, 3, a360.secToDuration(secs));
		});

		a360.pushTable(jQuery('#a360-top-content'), contentData, 'Top Content');
	};
		
	a360.updateListGrowth = function(event, data) {
		var listData = new google.visualization.DataTable();
		listData.addColumn('string', 'Month');
		listData.addColumn('number', 'subscribes');
		listData.addColumn('number', 'import');
		listData.addColumn('number', 'existing');

		listData.addRows(data.length);
		$.each(data, function(i, month) {
			listData.setCell(i, 0, month.month);
			listData.setCell(i, 1, parseInt(month.optins, 10));
			listData.setCell(i, 2, parseInt(month.imports, 10));
			listData.setCell(i, 3, parseInt(month.existing, 10));
		});

		var d = $('#a360-list-growth-chart').parent().width() * 0.9;
		$('#a360-list-growth-chart').width(Math.min(d, 350));
		var chart = new google.visualization.ColumnChart($('#a360-list-growth-chart').empty().get(0));
		chart.draw(listData, {
			isStacked: true,
			legend: 'bottom',
			height:Math.min(d * .75, 300),
			width:Math.min(d, 350),
			colors: ['#5D83AD', '#91AFD1', '#BDD2EF']
		});
	};
		
	a360.setMediumFilter = function(mediumFilter, tab) {
		a360.hideTooltip();
		a360.lineChart.drawFrame = $($('#a360-all-traffic-graph rect')[1]);
		a360.lineChart.height = a360.gfx.getDimensions(a360.lineChart.drawFrame).height;
		a360.lineChart.offsetY = a360.gfx.getOffset(a360.lineChart.drawFrame).top;
		
		var endCoords = [];
		var startCoords = [];
		var valueToY = function(value) {
			return a360.lineChart.height + a360.lineChart.offsetY - (
				(value - a360.lineChart.bottomLineValue) / (a360.lineChart.topLineValue - a360.lineChart.bottomLineValue) * a360.lineChart.height
			);
		};
		
		a360.lineChart.jqCircles.each(function(index) {
			var offset = a360.gfx.getCenterOffset(this);
			startCoords.push({ 
				x: offset.left, 
				y: offset.top 
			});
			endCoords.push({ 
				x: Math.round(offset.left),
				y: Math.round(valueToY(a360.lineChart.visitData.getProperty(index, 1, 'dayStats').getVisits(mediumFilter) || 0))
			});
		});
		
		tab = tab ? tab : $('#a360-' + mediumFilter.replace(/[^\w]/g, '-') +'-traffic-tab');
		if (tab && $(tab).size()) {
			$(tab).addClass('a360-selected').siblings().removeClass('a360-selected');
		}
		else {
			$('#a360-box-site-traffic ul.a360-tabs li:last').addClass('a360-selected').siblings().removeClass('a360-selected');
		}

		var frame = 0;
		var nFrames = (a360.gfx.renderer == 'svg' ? 25 : 5);
		setTimeout(function() {
			if (frame <= nFrames) {
				setTimeout(arguments.callee, 25);
				a360.animateLineChart(startCoords, endCoords, frame++, nFrames);
			}
		}, 25);

		a360.visitStats.mediumFilter = mediumFilter;
		
		$(a360).trigger('mediumFilterChanged', [mediumFilter]);
	};
		
		
	a360.updateVisitsChart = function(event, data) {
		var visitData = new google.visualization.DataTable();
		visitData.addColumn('date', 'Date');
		visitData.addColumn('number', 'Visits');

		if (!data || data.length == 0) {
			visitData.addRows(1);
			visitData.setCell(0, 0, 'No Visit Data');
		} 
		else {
			visitData.addRows(a360.visitStats.nDays);

			i = 0;
			$.each(a360.visitStats.days, function(dateKey, day) {
				visitData.setCell(i, 0, day.date);
				visitData.setCell(i, 1, day.getVisits('all traffic'));
				visitData.setProperty(i, 1, 'dayStats', day);
				i++;
			});
		}

		$('#a360-box-site-traffic ul.a360-tabs').empty();
		$.each(a360.visitStats.mediumSummaries, function(name, summary) {
			if (['all traffic', 'cpc', 'email', 'organic', 'referral'].indexOf(name) >= 0) {
				var tab = $('<li id="a360-' + name.replace(/[^\w]/g, '-') +'-traffic-tab">' + name + '</li>').click(function() {
					a360.setMediumFilter(name, this);
				});
				$('#a360-box-site-traffic ul.a360-tabs').prepend(tab);
			}
		});
		
		var tabWidth = 0;			// IE can't figure this bit out on its own; mostly harmless in other browsers.
		$('#a360-box-site-traffic ul.a360-tabs li').each(function() {
			var jq = $(this);
			tabWidth += jq.width() + 
				parseInt(jq.css('margin-left'), 10) + 
				parseInt(jq.css('margin-right'), 10) +
				parseInt(jq.css('padding-left'), 10) + 
				parseInt(jq.css('padding-right'), 10);
		});
		$('#a360-box-site-traffic ul.a360-tabs').width(tabWidth + 2);

		var dateFormatter = new google.visualization.DateFormat({formatType: 'medium'});
		dateFormatter.format(visitData, 0);
		
		a360.lineChart.visitData = visitData;

		$('#a360-all-traffic-graph').css('opacity', .1);
		var chart = new google.visualization.AreaChart($('#a360-all-traffic-graph').empty().get(0));
		
		google.visualization.events.addListener(chart, 'ready', function() {
			setTimeout(function() {
				
				var iframe = $('#a360-all-traffic-graph iframe').get(0);
				var iframeDoc = iframe.contentWindow || iframe.contentDocument;
				if (iframeDoc.document) {
					iframeDoc = iframeDoc.document;
				}
				
				a360.lineChart.iframeDoc = iframeDoc;

				var svg = $('svg', iframeDoc);
				var vml = $($('group', iframeDoc)[0]);
				a360.gfx = svg.size() ? a360.renderers.svg : a360.renderers.vml;
				var graphics = svg.size() ? svg.clone() : $(vml.html());
				$('#a360-all-traffic-graph').empty().append(graphics);

				a360.gfx.setStrokeColor($('#a360-all-traffic-graph rect:first'), '#ffffff');	// ie wub
				
				if (a360.gfx.renderer == 'svg') {
					
					var yAxisValues = $('#a360-all-traffic-graph text').map(function() {
						if (this.getAttribute('transform') !== null) {
							return null;
						}
						else {
							return parseFloat(this.childNodes[0].textContent.replace(/,/g, ''));
						}
					});
					a360.lineChart.topLineValue = yAxisValues[yAxisValues.length - 1];
					a360.lineChart.bottomLineValue = yAxisValues[0];
					
					// copy a background "all traffic" fill area
					var chartFill = $('path[fill="#92BCD0"]');
					a360.gfx.setFillColor(chartFill.clone().insertBefore(chartFill), '#cfcfcf');
				}
				else {
					
					var yAxisValues = $('textpath').map(function() {
						if (this.string.indexOf(' ') > -1) {
							return null;
						}
						else {
							return parseFloat(this.string.replace(/,/g, ''));
						}
					});
					a360.lineChart.topLineValue = yAxisValues[yAxisValues.length - 1];
					a360.lineChart.bottomLineValue = yAxisValues[0];

					// @todo: get the background fill working in IE
					//var chartFill = $('shape:eq(' + ($('shape').size() - 2) + ')');
					//var clonedFill = chartFill.clone().insertBefore(chartFill);
					//$('fill', clonedFill).attr('color', '#cfcfcf').attr('id', 'blah');
				}
				

				var circles = a360.lineChart.jqCircles = $(a360.gfx.circleName, graphics);
				circles.each(function(index) {

					$(this).attr('onclick', null);

					$(this).hover(function() {
						a360.gfx.setStrokeWeight($(this), $(this).data('strokeWeight') + 1);
					}, function() {
						a360.gfx.setStrokeWeight($(this), $(this).data('strokeWeight'));
					});

					a360.gfx.setFillColor($(this), '#ffffff');
					a360.gfx.setStrokeColor($(this), '#92BCD0');
					a360.gfx.setStrokeWeight($(this).data('strokeWeight', 1), 1);
					a360.gfx.setRadius($(this).data('radius', 3), 3);

					$(this).click(function(event) {

						a360.hideTooltip();
						a360.gfx.setRadius($(this), $(this).data('radius') + 3);

						var extra = '';
						var postProp = a360.lineChart.visitData.getProperty(index, 0, 'post');
						if (postProp) {
							extra += '\
								<div class="a360-post-point-link">\
									<a href="' + a360BaseUrl + '?p=' + postProp.ID + '"><strong>Post</strong>: ' + postProp.post_title.substring(0, 12) + '&hellip;</a>\
								</div>\
							';
						}
						var campaignProp = a360.lineChart.visitData.getProperty(index, 0, 'campaignSent');
						if (campaignProp) {
							extra += '\
								<div class="a360-campaign-point-link">\
									<a href="' + campaignProp.archive_url + '"><strong>Campaign</strong>: ' + campaignProp.title.substring(0, 12) + '&hellip;</a>\
								</div>\
							';
						}
						var visits = '';
						if (a360.visitStats.mediumFilter !== 'all traffic') {
							visits = (visitData.getProperty(index, 1, 'dayStats').getVisits(a360.visitStats.mediumFilter).commaize() || '0') + ' <span style="color:#aaaaaa">(out of ' + visitData.getValue(index, 1).commaize() + ')</span>';
						}
						else {
							visits = visitData.getValue(index, 1).commaize();
						}
						var content = '\
							<strong>' + visitData.getValue(index, 0).toString('dddd, MMM dd yyyy') + '</strong><br/>\
							' + extra + '\
							' + '<strong>Visits</strong>: ' + visits + '\
						';
						
						a360.renderTooltip(event, $('#a360-all-traffic-graph'), content);

						return false;
					});
				});

				$('#a360-all-traffic-graph').show();

				// now fetch posts and campaigns for overlay
				a360.fetchWPPosts();
				if (a360.mcAPIKey.length) {
					a360.fetchMCCampaigns();
				}
				$('#a360-all-traffic-graph').animate({ opacity: 1 }, function() {
					a360.setMediumFilter(a360.visitStats.mediumFilter);
				});
			}, 500);

		});
		chart.draw(visitData, {
			width: '100%', 
			height: 300, 
			legend: 'none', 
			title: '',
			backgroundColor: { stroke: null, strokeSize: 0, fill:'#ffffff' },
			borderColor: '#92BCD0',
			colors: ['#92BCD0'],
			axisFontSize: 11,
			enableTooltip: false,
			min: 0
		});

	};
		
	a360.updateVisitsChartWithPosts = function(event, data) {
		$.each(data, function(i, post) {
			if (post.post_date) {
				var postDate = new Date(post.post_date.substring(0, 'yyyy-mm-dd'.length).replace(/-/g, '/'));
				var nRows = a360.lineChart.visitData.getNumberOfRows();
				for (var i = 0; i < nRows; i++) {
					var dataDate = a360.lineChart.visitData.getValue(i, 0);
					if (postDate.equals(dataDate)) {
						var circle = a360.lineChart.jqCircles[i];
						$(circle).data('strokeWeight', 3);
						a360.gfx.setStrokeWeight(circle, 3);
						if (a360.lineChart.visitData.getProperty(i, 0, 'campaignSent')) {
							a360.gfx.setFillColor(circle, '#00576F');
							a360.gfx.setStrokeColor(circle, '#D98E26');
						}
						else {
							a360.gfx.setFillColor(circle, '#D98E26');
							a360.gfx.setStrokeColor(circle, '#D98E26');
						}
						a360.gfx.setRadius($(circle).data('radius', 5), 5);
						a360.lineChart.visitData.setProperty(i, 0, 'post', post);
					}
				}
			}
		});
	};
		
	a360.updateVisitsChartWithCampaigns = function(event, data) {
		$.each(data, function(i, campaign) {
			if (campaign.send_time) {
				var sendDate = new Date(campaign.send_time.substring(0, 'yyyy-mm-dd'.length).replace(/-/g, '/'));
				var nRows = a360.lineChart.visitData.getNumberOfRows();
				for (var i = 0; i < nRows; i++) {
					var dataDate = a360.lineChart.visitData.getValue(i, 0);
					if (sendDate.equals(dataDate)) {
						var circle = a360.lineChart.jqCircles[i];
						$(circle).data('strokeWeight', 3);
						a360.gfx.setStrokeWeight(circle, 3);
						if (a360.lineChart.visitData.getProperty(i, 0, 'post')) {
							a360.gfx.setFillColor(circle, '#00576F');
							a360.gfx.setStrokeColor(circle, '#D98E26');
						}
						else {
							a360.gfx.setFillColor(circle, '#00576F');
							a360.gfx.setStrokeColor(circle, '#00576F');
						}
						a360.gfx.setRadius($(circle).data('radius', 5), 5);
						a360.lineChart.visitData.setProperty(i, 0, 'campaignSent', campaign);
					}
				}
			}
		});
	};
		
	a360.hideTooltip = function() {
		$('.a360-tooltip-container').remove();
		if (a360.lineChart.jqCircles) {
			a360.lineChart.jqCircles.each(function() { a360.gfx.setRadius($(this), $(this).data('radius')); });
		}
	};
		
	a360.renderTooltip = function(event, container, content) {
		var containerOffset = container.offset();
		var className = '';
		var left = 0;
		var top = 0;
		var lr = '';
		var ul = '';

		if (event.pageX + 200 - containerOffset.left > jQuery(container).width()) {
			lr = 'right';
			left = event.pageX - containerOffset.left - 180;
		}
		else {
			lr = 'left';
			left = event.pageX - containerOffset.left - 5;
		}
		
		if (event.pageY - containerOffset.top < 100) {
			ul = 'upper';
			top = event.pageY - containerOffset.top - 40;
		}
		else {
			ul = 'lower';
			top = event.pageY - containerOffset.top - 60;
		}
		
		var markup = '';
		if (ul == 'upper') {
			markup = '\
				<div class="a360-tooltip-upper-' + lr + '-point"></div>\
				<div class="a360-tooltip-upper-' + lr + '-top"></div>\
			';
		}
		else {
			markup = '\
				<div class="a360-tooltip-lower-star-top"></div>\
			';
		}
		markup += '\
			<div class="a360-tooltip-body">' + content + '</div>\
		';
		
		if (ul == 'upper') {
			markup += '<div class="a360-tooltip-upper-star-bottom"></div>';
		}
		else {
			markup += '\
				<div class="a360-tooltip-lower-' + lr + '-bottom"></div>\
				<div class="a360-tooltip-lower-' + lr + '-point"></div>\
			';
		}
		
		var fade = (('support' in $) && $.support.opacity) || !($.browser.msie);
		if (fade) {
			var t = $('<div class="a360-tooltip-container">' + markup + '</div>').css({ left: left, top: top, opacity: 0.1 });
			$(container).prepend(t);
			t.click(function(event) {
				a360.hideTooltip();
			}).animate({
				top: (ul == 'upper' ? '+=40' : '-=' + (t.height() - 60)),
				opacity: 1
			}, 300);
		}
		else {
			// ie no likey 
			var t = $('<div class="a360-tooltip-container">' + markup + '</div>').css({ left: left, top: top });
			$(container).prepend(t);
			t.click(function(event) {
				a360.hideTooltip();
			}).animate({
				top: (ul == 'upper' ? '+=40' : '-=' + (t.height() - 70))
			}, 0);
		}
	};
		
	a360.pushTable = function(container, data, title) {
		var table = new a360.Table(data, title);
		container = $(container);
		var stack = container.data('tableStack') || container.data('tableStack', []).data('tableStack');
		stack.push(table);
		table.draw(container);
		a360.setHeaderTitle(container.parents('.a360-box'), table.title);
		container.parents('.a360-box').find('.a360-breadcrumbs').html(a360.getTableBreadcrumbs(container));
	};
	
	a360.popTable = function(container) {
		var stack = container.data('tableStack');
		stack.pop();
		container.empty();
		if (stack.length) {
			var table = stack[stack.length - 1];
			table.draw(container);
			a360.setHeaderTitle(container.parents('.a360-box'), table.title);
			container.parents('.a360-box').find('.a360-breadcrumbs').html(a360.getTableBreadcrumbs(container));
		}
	};
	
	a360.clearTableStack = function(container) {
		container.data('tableStack', []);
		a360.setHeaderTitle(container.parents('.a360-box'), '');
		container.parents('.a360-box').find('.a360-breadcrumbs').html('');
	};
	
	a360.getTableBreadcrumbs = function(container) {
		var stack = container.data('tableStack');
		if (stack.length < 2) {
			return '';
		}
		var links = [];
		$.each(stack, function(i, table) {
			if (i < stack.length - 1) {
				links.push('<a href="#" onclick="a360.popTable(jQuery(this).parents(\'.a360-box\').find(\'.a360-table-container\')); return false">' + table.title + '</a>');
			}
			else {
				links.push(table.title);
			}
		});
		return links.join(' &raquo; ');
	};

	a360.Table = function(data, title) {
		this.data = data;
		this.title = title;
		this.jqContainer = null;
		this.tableViz = null;
		this.sortedColumn = 2;
		this.page = 0;
	};
	
	a360.Table.prototype.draw = function(container) {

		this.jqContainer = $(container);
		
		this.tableViz = new google.visualization.Table(this.jqContainer.empty().get(0));
		
		google.visualization.events.addListener(this.tableViz, 'ready', this.handleRedraw._cfBind(this));
		google.visualization.events.addListener(this.tableViz, 'sort', (function(info) {
			this.sortedColumn = info.column + 1;
			this.handleRedraw();
		})._cfBind(this));
		google.visualization.events.addListener(this.tableViz, 'page', (function(info) {
			this.page = info.page;
			this.handleRedraw();
		})._cfBind(this));

		this.tableViz.draw(this.data, { 
			width: '100%', 
			page: 'enable', 
			showRowNumber: true, 
			sortAscending: false,
			sortColumn: 1,
			allowHtml: true,
			startPage: this.page,
			cssClassNames: {
				headerRow: 'a360-table-header',
				tableRow: 'a360-table-row',
				selectedTableRow: 'a360-table-row-selected',
				hoverTableRow: 'a360-table-row-hover',
				oddTableRow: 'a360-table-row-odd'
			}
		});
	};
	
	a360.Table.prototype.handleRedraw = function() {
		jQuery('.a360-table-header td', this.jqContainer).each(function(i) {
		    jQuery(this).width(['2%', '47%', '15%', '15%', '20%'][i]);
		});
		jQuery('button', this.jqContainer).addClass('button');
		jQuery('td', this.jqContainer).removeClass('sorted');
		var sortedColumn = this.sortedColumn;
		jQuery('.a360-table-header, .a360-table-row, .a360-table-row-odd', this.jqContainer).each(function() {
			jQuery('td:eq(' + (sortedColumn) + ')', this).addClass('sorted');
		});
	};


	a360.lineChart = {
		iframeDoc: null,
		jqCircles: null,
		visitData: null,
		
		drawFrame: null,
		height: null,
		offsetY: null,
		topLineValue: 0,
		bottomLineValue: 0
	};
	
	a360.maxFetchAttempts = 10;
	a360.fetchFailed = function(f, args, failureEventName, failureEventArgs) {
		f.attempts = ('attempts' in f) ? f.attempts + 1 : 1;
		if (f.attempts < a360.maxFetchAttempts) {
			f.apply(a360, (args || []));
		}
		else {
			$(a360).trigger(failureEventName, failureEventArgs);
			f.attempts = 0;
		}
		
	};
	a360.fetchSucceeded = function(f, eventName, eventArgs) {
		f.attempts = 0;
		$(a360).trigger(eventName, eventArgs);
	};
	
	a360.setHeaderTitle = function(box, title) {
		$('.a360-box-header h3', box).html(title);
	};
	
	// note that box needs to be position:relative or absolute.
	a360.addHeaderError = function(box, error) {
		$('.a360-box-status', box).removeClass().addClass('a360-box-status a360-error').click(function(event) {
			a360.renderTooltip(event, box, error);
		});
	};
	
	a360.setHeaderStatus = function(box, status) {
		$('.a360-box-status', box).unbind().removeClass().addClass('a360-box-status a360-' + status);
	};

	a360.secToDuration = function(sec) {
		var min = Math.floor(sec / 60);
		var hours = (min < 60 ? 0 : Math.floor(min / 60));
		min -= hours * 60;
		var sec = sec - (hours * 3600) - (min * 60);
		hours = hours < 10 ? '0' + hours : hours + '';
		min = min < 10 ? '0' + min : min + '';
		sec = sec < 10 ? '0' + sec : sec + '';
		return hours + ':' + min + ':' + sec;
	};

	a360.visitStats = {
		days: {},
		mediumSummaries: {},
		nDays: 0,
		mediumFilter: 'all traffic'
	};

	a360.MediumSummary = function(medium) {
		this.medium = medium;
		
		this.totalVisits = 0;
		this.totalBounceRate = 0;
		this.totalNewVisits = 0;
		this.totalPageviews = 0;
		this.totalTimeOnSite = 0;
	
		this.avgTimeOnSite = '';
		this.bounceRate = '';
		this.percentNewVisits = '';
		this.totalPagesPerVisit = '';
	
		// for sparklines
		this.visits = [];
		this.bounceRates = [];
		//this.bounceRates = [];
		this.newVisits = [];
		this.pageviews = [];
		this.timeOnSite = [];
		this.pagesPerVisit = [];
	};

	// a day's stats 
	/**
	 * {
	 * 		metric1: {
	 * 			'all traffic': value,
	 * 			medium1: value,
	 * 			medium2: value
	 * 			...
	 * 		},
	 * 		metric2: {
	 * 			'all traffic': value,
	 * 			...
	 * 		}
	 * }
	 */
	a360.DayStats = function(date) {
		this.date = date;
		// create getters for each of our metrics. each method takes a medium as argument, so, ex:
		// 		var visits = day.getVisits('cpc');
		//		var views = day.getPageviews('cpc');
		// etc ...
		$.each(['visits', 'bounces', 'newVisits', 'pageviews', 'timeOnSite', 'pagesPerVisit', 'entrances'], (function(i, metric) {
			this[metric] = { 'all traffic': 0 };
			this['get' + metric.substring(0, 1).toUpperCase() + metric.substr(1)] = (function(medium) {
				return this[metric][medium];
			})._cfBind(this);
		})._cfBind(this));
	};
	

	a360.fetchGAVisits = function() {
		$(a360).trigger('fetchingGAVisits');
		$.get('', {
			a360_action: 'get_ga_data',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd'),
			data_type: 'visits'
		}, function(result, status) {
			if (result.success) {
				a360.visitStats.days = {};
				a360.visitStats.mediumSummaries = {
					'all traffic': new a360.MediumSummary('all traffic')
				};
				a360.visitStats.nDays = 0;
				
				var data = result.data;
				var medium = '';
				var summary = null;
				for (var i = 0; i < data.length; i++) {
					var dateKey = data[i].dimensions.date;
					medium = data[i].dimensions.medium;

					// if this is the first time we've seen this date
					if (!(dateKey in a360.visitStats.days)) {
						a360.visitStats.days[dateKey] = new a360.DayStats(new Date(
							parseInt(dateKey.substr(0, 4), 10), 
							parseInt(dateKey.substr(4, 2), 10) - 1, 
							parseInt(dateKey.substr(6, 2), 10)
						));
						a360.visitStats.nDays++;
					}
					
					var dayStats = a360.visitStats.days[dateKey];
					
					$.each(data[i].metrics, function(metricKey, value) {
						dayStats[metricKey][medium] = value;
						dayStats[metricKey]['all traffic'] = (('all traffic' in dayStats[metricKey]) ? dayStats[metricKey]['all traffic'] + value : value);
					});
					
					
					if (!(medium in a360.visitStats.mediumSummaries)) {
						a360.visitStats.mediumSummaries[medium] = new a360.MediumSummary(medium);
					}
					
					summary = a360.visitStats.mediumSummaries[medium];

					summary.visits.push(data[i].metrics.visits);
					summary.totalVisits += data[i].metrics.visits;
					summary.bounceRates.push(data[i].metrics.entrances > 0 ? data[i].metrics.bounces / data[i].metrics.entrances : 0);
					summary.totalBounceRate += (data[i].metrics.entrances > 0 ? data[i].metrics.bounces / data[i].metrics.entrances : 0);
					summary.newVisits.push(data[i].metrics.visits > 0 ? data[i].metrics.newVisits / data[i].metrics.visits : 0);
					summary.totalNewVisits += data[i].metrics.newVisits;
					summary.pageviews.push(data[i].metrics.pageviews);
					summary.totalPageviews += data[i].metrics.pageviews;
					summary.timeOnSite.push(data[i].metrics.visits > 0 ? data[i].metrics.timeOnSite / data[i].metrics.visits : 0);
					summary.totalTimeOnSite += data[i].metrics.timeOnSite;
					summary.pagesPerVisit.push(data[i].metrics.visits > 0 ? data[i].metrics.pageviews / data[i].metrics.visits : 0);
					
				}
				
				$.each(a360.visitStats.mediumSummaries, function(medium, summary) {
					summary.avgTimeOnSite = a360.secToDuration(Math.round(summary.totalTimeOnSite / summary.totalVisits));
					summary.bounceRate = (summary.totalBounceRate / a360.visitStats.nDays * 100).toPrecision(4) + '%';
					summary.percentNewVisits = ((summary.totalNewVisits / summary.totalVisits) * 100).toPrecision(4) + '%';
					summary.totalPagesPerVisit = (summary.totalPageviews / summary.totalVisits).toPrecision(3);
				});
				
				// compose summary for all traffic
				medium = 'all traffic';
				summary = a360.visitStats.mediumSummaries[medium];

				$.each(a360.visitStats.days, function(dateKey, day) {
					summary.visits.push(day.getVisits(medium));
					summary.totalVisits += day.visits[medium];
					summary.bounceRates.push(day.entrances[medium] > 0 ? day.bounces[medium] / day.entrances[medium] : 0);
					summary.totalBounceRate += (day.entrances[medium] > 0 ? day.bounces[medium] / day.entrances[medium] : 0);
					summary.newVisits.push(day.visits[medium] > 0 ? day.newVisits[medium] / day.visits[medium] : 0);
					summary.totalNewVisits += day.newVisits[medium];
					summary.pageviews.push(day.pageviews[medium]);
					summary.totalPageviews += day.pageviews[medium];
					summary.timeOnSite.push(day.visits[medium] > 0 ? day.timeOnSite[medium] / day.visits[medium] : 0);
					summary.totalTimeOnSite += day.timeOnSite[medium];
					summary.pagesPerVisit.push(day.visits[medium] > 0 ? day.pageviews[medium] / day.visits[medium] : 0);
				});
				
				summary.avgTimeOnSite = a360.secToDuration(Math.round(summary.totalTimeOnSite / summary.totalVisits));
				summary.bounceRate = (summary.totalBounceRate / a360.visitStats.nDays * 100).toPrecision(4) + '%';
				summary.percentNewVisits = ((summary.totalNewVisits / summary.totalVisits) * 100).toPrecision(4) + '%';
				summary.totalPagesPerVisit = (summary.totalPageviews / summary.totalVisits).toPrecision(3);

				a360.fetchSucceeded(a360.fetchGAVisits, 'gaVisitsFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchGAVisits, undefined, 'gaVisitsFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchGATopContent = function() {
		$(a360).trigger('fetchingGATopContent');
		$.get('', {
			a360_action: 'get_ga_data',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd'),
			data_type: 'top_content'
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGATopContent, 'gaTopContentFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchGATopContent, undefined, 'gaTopContentFetchFailed', [result.error]);
			}
		}, 'json');


	};
	
	a360.fetchGAGeo = function() {
		$(a360).trigger('fetchingGAGeo');
		$.get('', {
			a360_action: 'get_ga_data',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd'),
			data_type: 'geo'
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGAGeo, 'gaGeoFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchGAGeo, undefined, 'gaGeoFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchGATopReferrals = function() {
		$(a360).trigger('fetchingGATopReferrals');
		$.get('', {
			a360_action: 'get_ga_data',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd'),
			data_type: 'top_referrals'
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGATopReferrals, 'gaTopReferralsFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchGATopReferrals, undefined, 'gaTopReferralsFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchGAReferralMedia = function() {
		$(a360).trigger('fetchingGAReferralMedia');
		$.get('', {
			a360_action: 'get_ga_data',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd'),
			data_type: 'referral_media'
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGAReferralMedia, 'gaReferralMediaFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchGAReferralMedia, undefined, 'gaReferralMediaFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchWPPosts = function() {
		$(a360).trigger('fetchingWPPosts');
		$.get('', {
			a360_action: 'get_wp_posts',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchWPPosts, 'wpPostsFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchWPPosts, undefined, 'wpPostsFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchMCCampaigns = function() {
		$(a360).trigger('fetchingMCCampaigns');
		$.get('', {
			a360_action: 'get_mc_data',
			data_type: 'campaigns',
			start_date: a360.displayDates.start.toString('yyyy-MM-dd HH:mm:ss'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd HH:mm:ss')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchMCCampaigns, 'mcCampaignsFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchMCCampaigns, undefined, 'mcCampaignsFetchFailed', [result.error]);
			}
		}, 'json');
	};
	
	a360.fetchMCListGrowth = function(listID) {
		$(a360).trigger('fetchingMCListGrowth');
		$.get('', {
			a360_action: 'get_mc_data',
			data_type: 'list_growth',
			list_id: listID,
			start_date: a360.displayDates.start.toString('yyyy-MM-dd HH:mm:ss'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd HH:mm:ss')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchMCListGrowth, 'mcListGrowthFetched', [result.data]);
			}
			else {
				a360.fetchFailed(a360.fetchMCListGrowth, [listID], 'mcListGrowthFetchFailed', [listID, result.error]);
			}
		}, 'json');
	};

	a360.fetchGAKeywords = function(sourceName) {
		$(a360).trigger('fetchingGAKeywords');
		$.get('', {
			a360_action: 'get_ga_data',
			data_type: 'keywords',
			source_name: sourceName,
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGAKeywords, 'gaKeywordsFetched', [result.data, sourceName]);
			}
			else {
				a360.fetchFailed(a360.fetchGAKeywords, [sourceName], 'gaKeywordsFetchFailed', [sourceName, result.error]);
			}
		}, 'json');
	};

	a360.fetchGAReferralPaths = function(sourceName) {
		$(a360).trigger('fetchingGAReferralPaths');
		$.get('', {
			a360_action: 'get_ga_data',
			data_type: 'referral_paths',
			source_name: sourceName,
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGAReferralPaths, 'gaReferralPathsFetched', [result.data, sourceName]);
			}
			else {
				a360.fetchFailed(a360.fetchGAReferralPaths, [sourceName], 'gaReferralPathsFetchFailed', [sourceName, result.error]);
			}
		}, 'json');
	};

	a360.fetchGAEmailReferrals = function(sourceName) {
		$(a360).trigger('fetchingGAEmailReferrals');
		$.get('', {
			a360_action: 'get_ga_data',
			data_type: 'email_referrals',
			source_name: sourceName,
			start_date: a360.displayDates.start.toString('yyyy-MM-dd'),
			end_date: a360.displayDates.end.toString('yyyy-MM-dd')
		}, function(result, status) {
			if (result.success) {
				a360.fetchSucceeded(a360.fetchGAReferralPaths, 'gaEmailReferralsFetched', [result.data, sourceName]);
			}
			else {
				a360.fetchFailed(a360.fetchGAReferralPaths, [sourceName], 'gaEmailReferralsFetchFailed', [sourceName, result.error]);
			}
		}, 'json');
	};

	$(document).ready(function() {
		if (a360.pageName == 'dashboard') {
			(a360.handleDashboardReady._cfBind(a360))();
		}

	});


})(jQuery);
