function NormalizeString(s)
{
	if (typeof s != "string")
	{
		return s;
	}

	return s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

EmptyElementWhenMatches = function(selector, text)
{
	if ($(selector).text() === text)
	{
		$(selector).text('');
	}
};

String.prototype.contains = function(search)
{
	return NormalizeString(this).toLowerCase().indexOf(NormalizeString(search).toLowerCase()) !== -1;
};

String.prototype.replaceAll = function(search, replacement)
{
	return this.replace(new RegExp(search, "g"), replacement);
};

String.prototype.escapeHTML = function()
{
	return this.replace(/[&<>"'`=\/]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' })[s]);;
};

GetUriParam = function(key)
{
	var currentUri = window.location.search.substring(1);
	var vars = currentUri.split('&');

	for (i = 0; i < vars.length; i++)
	{
		var currentParam = vars[i].split('=');

		if (currentParam[0] === key)
		{
			return currentParam[1] === undefined ? true : decodeURIComponent(currentParam[1]);
		}
	}
};

UpdateUriParam = function(key, value)
{
	var queryParameters = new URLSearchParams(location.search);
	queryParameters.set(key, value);
	window.history.replaceState({}, "", decodeURIComponent(`${location.pathname}?${queryParameters}`));
};

RemoveUriParam = function(key)
{
	var queryParameters = new URLSearchParams(location.search);
	queryParameters.delete(key);
	window.history.replaceState({}, "", decodeURIComponent(`${location.pathname}?${queryParameters}`));
};

BoolVal = function(test)
{
	if (!test)
	{
		return false;
	}

	var anything = test.toString().toLowerCase();
	if (anything === true || anything === "true" || anything === "1" || anything === "on")
	{
		return true;
	}
	else
	{
		return false;
	}
}

GetFileNameFromPath = function(path)
{
	return path.split("/").pop().split("\\").pop();
}

GetFileExtension = function(pathOrFileName)
{
	return pathOrFileName.split(".").pop();
}

$.extend($.expr[":"],
	{
		"contains_case_insensitive": function(elem, i, match, array)
		{
			return NormalizeString(elem.textContent || elem.innerText || "").toLowerCase().indexOf(NormalizeString(match[3] || "").toLowerCase()) >= 0;
		}
	});

FindObjectInArrayByPropertyValue = function(array, propertyName, propertyValue)
{
	for (var i = 0; i < array.length; i++)
	{
		if (array[i][propertyName] == propertyValue)
		{
			return array[i];
		}
	}

	return null;
}

FindAllObjectsInArrayByPropertyValue = function(array, propertyName, propertyValue)
{
	var returnArray = [];

	for (var i = 0; i < array.length; i++)
	{
		if (array[i][propertyName] == propertyValue)
		{
			returnArray.push(array[i]);
		}
	}

	return returnArray;
}

$.fn.hasAttr = function(name)
{
	return this.attr(name) !== undefined;
};

function IsJsonString(text)
{
	try
	{
		JSON.parse(text);
	} catch (e)
	{
		return false;
	}
	return true;
}

function Delay(callable, delayMilliseconds)
{
	var timer = 0;
	return function()
	{
		var context = this;
		var args = arguments;

		clearTimeout(timer);
		timer = setTimeout(function()
		{
			callable.apply(context, args);
		}, delayMilliseconds || 0);
	};
}

$.fn.isVisibleInViewport = function(extraHeightPadding = 0)
{
	var elementTop = $(this).offset().top;
	var viewportTop = $(window).scrollTop() - extraHeightPadding;

	return elementTop + $(this).outerHeight() > viewportTop && elementTop < viewportTop + $(window).height();
};

function animateCSS(selector, animationName, callback, speed = "faster")
{
	var nodes = $(selector);
	nodes.addClass('animated').addClass(speed).addClass(animationName);

	function handleAnimationEnd()
	{
		nodes.removeClass('animated').removeClass(speed).removeClass(animationName);
		nodes.unbind('animationend', handleAnimationEnd);

		if (typeof callback === 'function')
		{
			callback();
		}
	}

	nodes.on('animationend', handleAnimationEnd);
}

function RandomString()
{
	return Math.random().toString(36).substring(2, 100) + Math.random().toString(36).substring(2, 100);
}

function QrCodeImgHtml(text)
{
	var dummyCanvas = document.createElement("canvas");
	var img = document.createElement("img");

	bwipjs.toCanvas(dummyCanvas, {
		bcid: "qrcode",
		text: text,
		scale: 4,
		includetext: false
	});
	img.src = dummyCanvas.toDataURL("image/png");
	img.classList.add("qr-code");

	return img.outerHTML;
}

function CleanFileName(fileName)
{
	// Umlaute seem to cause problems on Linux...
	fileName = fileName.toLowerCase().replaceAll(/ä/g, 'ae').replaceAll(/ö/g, 'oe').replaceAll(/ü/g, 'ue').replaceAll(/ß/g, 'ss');

	// Multiple spaces seem to be a problem, so simply strip them all
	fileName = fileName.replace(/\s+/g, "");

	// Remove any non-ASCII character
	fileName = fileName.replace(/[^\x00-\x7F]/g, "");

	return fileName;
}


function nl2br(s)
{
	if (s == null || s === undefined)
	{
		return "";
	}

	return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1<br>$2");
}

if ($.fn.combobox)
{
	$.fn.combobox.defaults.matcher = function(item)
	{
		return NormalizeString(item).toLowerCase().contains(NormalizeString(this.query).toLowerCase());
	};
}

if ($.fn.DataTable || $.fn.dataTable)
{
	var DT = $.fn.DataTable || $.fn.dataTable;

	// Global search term normalization
	// We use the internal _api_register if possible, or just the prototype
	var oldApiSearch = DT.Api.prototype.search;
	DT.Api.prototype.search = function(conf, ...args)
	{
		if (typeof conf === 'string')
		{
			conf = NormalizeString(conf);
		}
		return oldApiSearch.apply(this, [conf, ...args]);
	};

	// We can't easily override column().search() via prototype because column() returns a new instance
	// but we can try to hook into the initialization or use a interval to check instances if needed.
	// However, most DataTables versions use the same internal search function.
	// Let's try to hook into the column search specifically if it's separate.
	if (DT.Api.prototype.column)
	{
		// In many versions, column().search is the same function as global search
		// but let's be sure by checking if we need to hook it specifically.
	}

	// Global DataTables filter for accent-insensitive searching
	// This acts as a secondary filter to show rows that should match regardless of DataTables internal index
	$.fn.dataTable.ext.search.push(function(settings, data, dataIndex)
	{
		var searchTerm = settings.oPreviousSearch.sSearch;
		if (!searchTerm)
		{
			return true;
		}

		var normalizedSearchTerm = NormalizeString(searchTerm);
		var words = normalizedSearchTerm.split(' ');

		// Row data is already in 'data' array (one entry per column)
		var rowData = data.join(' ');
		var normalizedRowData = NormalizeString(rowData);

		for (var i = 0; i < words.length; i++)
		{
			if (normalizedRowData.indexOf(words[i]) === -1)
			{
				return false;
			}
		}

		return true;
	});

	// Ensure standard search types also index normalized data
	var types = ['string', 'html', 'chinese-string', 'num', 'num-fmt', 'date'];
	types.forEach(function(type)
	{
		var oldSearchType = DT.ext.type.search[type];
		DT.ext.type.search[type] = function(data)
		{
			var processed = oldSearchType ? oldSearchType(data) : data;
			return typeof processed === 'string' ? processed + ' ' + NormalizeString(processed) : processed;
		};
	});
}
