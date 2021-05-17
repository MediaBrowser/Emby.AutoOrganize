define(['globalize', 'serverNotifications', 'events', 'scripts/taskbutton', 'datetime', 'loading', 'mainTabsManager', 'paper-icon-button-light', 'emby-linkbutton', 'detailtablecss'], function (globalize, serverNotifications, events, taskButton, datetime, loading, mainTabsManager) {
    'use strict';

    ApiClient.getFileOrganizationResults = function (options) {

        var url = this.getUrl("Library/FileOrganization", options || {});

        return this.getJSON(url);
    };

    ApiClient.deleteOriginalFileFromOrganizationResult = function (id) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/File");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.clearOrganizationLog = function () {

        var url = this.getUrl("Library/FileOrganizations");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.clearOrganizationCompletedLog = function () {

        var url = this.getUrl("Library/FileOrganizations/Completed");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.performOrganization = function (id) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Organize");

        return this.ajax({
            type: "POST",
            url: url
        });
    };

    ApiClient.performEpisodeOrganization = function (id, options) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Episode/Organize");

        return this.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    ApiClient.performMovieOrganization = function (id, options) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Movie/Organize");

        return this.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    ApiClient.getSmartMatchInfos = function (options) {

        options = options || {};

        var url = this.getUrl("Library/FileOrganizations/SmartMatches", options);

        return this.ajax({
            type: "GET",
            url: url,
            dataType: "json"
        });
    };

    ApiClient.deleteSmartMatchEntries = function (entries) {

        var url = this.getUrl("Library/FileOrganizations/SmartMatches/Delete");

        var postData = {
            Entries: entries
        };

        return this.ajax({

            type: "POST",
            url: url,
            data: JSON.stringify(postData),
            contentType: "application/json"
        });
    };

    var query = {

        StartIndex: 0,
        Limit: 50
    };

    var currentResult;
    var pageGlobal;

    function parentWithClass(elem, className) {

        while (!elem.classList || !elem.classList.contains(className)) {
            elem = elem.parentNode;

            if (!elem) {
                return null;
            }
        }

        return elem;
    }

    function showStatusMessage(id) {

        var item = currentResult.Items.filter(function (i) {

            return i.Id === id;
        })[0];

        Dashboard.alert({

            title: getStatusText(item, false),
            message: item.StatusMessage
        });
    }

    function deleteOriginalFile(page, id) {

        var item = currentResult.Items.filter(function (i) {

            return i.Id === id;
        })[0];

        var message = 'The following file will be deleted:' + '<br/><br/>' + item.OriginalPath + '<br/><br/>' + 'Are you sure you wish to proceed?';

        require(['confirm'], function (confirm) {

            confirm(message, 'Delete File').then(function () {

                loading.show();

                ApiClient.deleteOriginalFileFromOrganizationResult(id).then(function () {

                    loading.hide();

                    reloadItems(page, true);

                }, Dashboard.processErrorResponse);
            });
        });
    }

    function organizeFileWithCorrections(page, item) {

        showCorrectionPopup(page, item);
    }

    function showCorrectionPopup(page, item) {

        require([Dashboard.getConfigurationResourceUrl('FileOrganizerJs')], function (fileorganizer) {

            fileorganizer.show(item).then(function () {
                reloadItems(page, false);
            },
            function () { /* Do nothing on reject */ });
        });
    }

    function organizeFile(page, id) {

        var item = currentResult.Items.filter(function (i) {

            return i.Id === id;
        })[0];

        if (!item.TargetPath) {
            organizeFileWithCorrections(page, item);

            return;
        }

        for (var i = 0; i < item.DuplicatePaths.length; i++) { //remove the target filename from the list (as we will overwrite it and better for display)
            if (item.DuplicatePaths[i].replace(/^.*[\\\/]/, '') === item.TargetPath.replace(/^.*[\\\/]/, '')) {
                item.DuplicatePaths.splice(i, 1);
                i--;
            }
        }

        var message = 'The following file will be moved from:' + '<br/><br/>' + item.OriginalPath + '<br/><br/>' + 'To:' + '<br/><br/>' + item.TargetPath;
        if (item.DuplicatePaths.length > 0) {
            message += '<br/><br/>' + 'The following duplicates will be deleted:';
            message += '<br/><br/>' + item.DuplicatePaths.join('<br/>');
        }

        message += '<br/><br/>' + 'Are you sure you wish to proceed?';

        require(['confirm'], function (confirm) {

            confirm(message, 'Organize File').then(function () {

                loading.show();

                ApiClient.performOrganization(id).then(function () {

                    loading.hide();

                    reloadItems(page, true);

                }, Dashboard.processErrorResponse);
            });
        });
    }

    function reloadItems(page, showSpinner) {

        if (showSpinner) {
            loading.show();
        }

        ApiClient.getFileOrganizationResults(query).then(function (result) {

            currentResult = result;
            renderResults(page, result);

            loading.hide();
        }, Dashboard.processErrorResponse);
    }

    function getStatusText(item, enhance) {

        var status = item.Status;

        var color = null;

        if (status === 'SkippedExisting') {
            status = 'Skipped';
        }
        else if (status === 'Failure') {
            color = '#cc0000';
            status = 'Failed';
        }
        if (status === 'Success') {
            color = 'green';
            status = 'Success';
        }

        if (enhance) {

            if (item.StatusMessage) {

                return '<a style="color:' + color + ';" data-resultid="' + item.Id + '" is="emby-linkbutton" href="#" class="button-link btnShowStatusMessage">' + status + '</a>';
            } else {
                return '<span data-resultid="' + item.Id + '" style="color:' + color + ';">' + status + '</span>';
            }
        }

        return status;
    }

    function getQueryPagingHtml(options) {
        var startIndex = options.startIndex;
        var limit = options.limit;
        var totalRecordCount = options.totalRecordCount;

        var html = '';

        var recordsEnd = Math.min(startIndex + limit, totalRecordCount);

        var showControls = limit < totalRecordCount;

        html += '<div class="listPaging">';

        if (showControls) {
            html += '<span style="vertical-align:middle;">';

            var startAtDisplay = totalRecordCount ? startIndex + 1 : 0;
            html += startAtDisplay + '-' + recordsEnd + ' of ' + totalRecordCount;

            html += '</span>';

            html += '<div style="display:inline-block;">';

            html += '<button is="paper-icon-button-light" class="btnPreviousPage autoSize" ' + (startIndex ? '' : 'disabled') + '><i class="md-icon">&#xE5C4;</i></button>';
            html += '<button is="paper-icon-button-light" class="btnNextPage autoSize" ' + (startIndex + limit >= totalRecordCount ? 'disabled' : '') + '><i class="md-icon">&#xE5C8;</i></button>';

            html += '</div>';
        }

        html += '</div>';

        return html;
    }

    function renderResults(page, result) {

        if (Object.prototype.toString.call(page) !== "[object Window]") {

            var rows = result.Items.map(function (item) {

                var html = '';

                html += '<tr class="detailTableBodyRow detailTableBodyRow-shaded" id="row' + item.Id + '">';

                html += renderItemRow(item);

                html += '</tr>';

                return html;
            }).join('');

            var resultBody = page.querySelector('.resultBody');
            resultBody.innerHTML = rows;

            resultBody.addEventListener('click', handleItemClick);

            var pagingHtml = getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: result.TotalRecordCount,
                showLimit: false,
                updatePageSizeSetting: false
            });

            var topPaging = page.querySelector('.listTopPaging');
            topPaging.innerHTML = pagingHtml;

            var bottomPaging = page.querySelector('.listBottomPaging');
            bottomPaging.innerHTML = pagingHtml;

            var btnNextTop = topPaging.querySelector(".btnNextPage");
            var btnNextBottom = bottomPaging.querySelector(".btnNextPage");
            var btnPrevTop = topPaging.querySelector(".btnPreviousPage");
            var btnPrevBottom = bottomPaging.querySelector(".btnPreviousPage");

            if (btnNextTop) {
                btnNextTop.addEventListener('click', function () {
                    query.StartIndex += query.Limit;
                    reloadItems(page, true);
                });
            }

            if (btnNextBottom) {
                btnNextBottom.addEventListener('click', function () {
                    query.StartIndex += query.Limit;
                    reloadItems(page, true);
                });
            }

            if (btnPrevTop) {
                btnPrevTop.addEventListener('click', function () {
                    query.StartIndex -= query.Limit;
                    reloadItems(page, true);
                });
            }

            if (btnPrevBottom) {
                btnPrevBottom.addEventListener('click', function () {
                    query.StartIndex -= query.Limit;
                    reloadItems(page, true);
                });
            }

            var btnClearLog = page.querySelector('.btnClearLog');
            var btnClearCompleted = page.querySelector('.btnClearCompleted');

            if (result.TotalRecordCount) {
                btnClearLog.classList.remove('hide');
                btnClearCompleted.classList.remove('hide');
            } else {
                btnClearLog.classList.add('hide');
                btnClearCompleted.classList.add('hide');
            }
        }
    }

    function renderItemRow(item) {

        var html = '';

        html += '<td class="detailTableBodyCell" style="width:25px">';
        var hide = item.IsInProgress ? '' : ' hide';
        html += '    <img class="' + hide + '" src="data:image/gif;base64,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"/>';
        html += '</td>';

        html += '<td class="detailTableBodyCell" data-title="Date">';
        var date = datetime.parseISO8601Date(item.Date, true);
        html += datetime.toLocaleDateString(date);
        html += '</td>';

        html += '<td data-title="Source" class="detailTableBodyCell fileCell">';
        var status = item.Status;

        if (item.IsInProgress) {
            html += '<span style="color:darkorange;">';
            html += item.OriginalFileName;
            html += '</span>';
        }
        else if (status === 'SkippedExisting') {
            html += '<a is="emby-linkbutton" data-resultid="' + item.Id + '" style="color:blue;" href="#" class="button-link btnShowStatusMessage">';
            html += item.OriginalFileName;
            html += '</a>';
        }
        else if (status === 'Failure') {
            html += '<a is="emby-linkbutton" data-resultid="' + item.Id + '" style="color:red;" href="#" class="button-link btnShowStatusMessage">';
            html += item.OriginalFileName;
            html += '</a>';
        } else {
            html += '<span style="color:green;">';
            html += item.OriginalFileName;
            html += '</span>';
        }
        html += '</td>';

        html += '<td data-title="Destination" class="detailTableBodyCell fileCell">';
        html += item.TargetPath || '';
        html += '</td>';

        html += '<td class="detailTableBodyCell organizerButtonCell" style="whitespace:no-wrap;">';

        if (item.Status !== 'Success') {

            html += '<button type="button" is="paper-icon-button-light" data-resultid="' + item.Id + '" class="btnProcessResult organizerButton autoSize" title="Organize"><i class="md-icon">folder</i></button>';
            html += '<button type="button" is="paper-icon-button-light" data-resultid="' + item.Id + '" class="btnDeleteResult organizerButton autoSize" title="Delete"><i class="md-icon">delete</i></button>';
        }

        html += '</td>';

        return html;
    }

    function handleItemClick(e) {

        var id;

        var buttonStatus = parentWithClass(e.target, 'btnShowStatusMessage');
        if (buttonStatus) {

            id = buttonStatus.getAttribute('data-resultid');
            showStatusMessage(id);
        }

        var buttonOrganize = parentWithClass(e.target, 'btnProcessResult');
        if (buttonOrganize) {

            id = buttonOrganize.getAttribute('data-resultid');
            organizeFile(e.view, id);
        }

        var buttonDelete = parentWithClass(e.target, 'btnDeleteResult');
        if (buttonDelete) {

            id = buttonDelete.getAttribute('data-resultid');
            deleteOriginalFile(e.view, id);
        }
    }

    function onServerEvent(e, apiClient, data) {

        if (e.type === 'ScheduledTaskEnded') {

            if (data && data.Key === 'AutoOrganize') {
                reloadItems(pageGlobal, false);
            }
        } else if (e.type === 'AutoOrganize_ItemUpdated' && data) {

            updateItemStatus(pageGlobal, data);
        } else {

            reloadItems(pageGlobal, false);
        }
    }

    function updateItemStatus(page, item) {

        var rowId = '#row' + item.Id;
        var row = page.querySelector(rowId);

        if (row) {

            row.innerHTML = renderItemRow(item);
        }
    }

    function getTabs() {
        return [
            {
                href: Dashboard.getConfigurationPageUrl('AutoOrganizeLog'),
                name: 'Activity Log'
            },
            {
                href: Dashboard.getConfigurationPageUrl('AutoOrganizeTv'),
                name: 'TV'
            },
            {
                href: Dashboard.getConfigurationPageUrl('AutoOrganizeMovie'),
                name: 'Movie'
            },
            {
                href: Dashboard.getConfigurationPageUrl('AutoOrganizeSmart'),
                name: 'Smart Matches'
            }];
    }

    return function (view, params) {

        pageGlobal = view;

        view.querySelector('.btnClearLog').addEventListener('click', function () {

            ApiClient.clearOrganizationLog().then(function () {
                query.StartIndex = 0;
                reloadItems(view, true);
            }, Dashboard.processErrorResponse);
        });

        view.querySelector('.btnClearCompleted').addEventListener('click', function () {

            ApiClient.clearOrganizationCompletedLog().then(function () {
                query.StartIndex = 0;
                reloadItems(view, true);
            }, Dashboard.processErrorResponse);
        });

        view.addEventListener('viewshow', function (e) {

            mainTabsManager.setTabs(this, 0, getTabs);

            reloadItems(view, true);

            events.on(serverNotifications, 'AutoOrganize_LogReset', onServerEvent);
            events.on(serverNotifications, 'AutoOrganize_ItemUpdated', onServerEvent);
            events.on(serverNotifications, 'AutoOrganize_ItemRemoved', onServerEvent);
            events.on(serverNotifications, 'AutoOrganize_ItemAdded', onServerEvent);
            events.on(serverNotifications, 'ScheduledTaskEnded', onServerEvent);

            // on here
            taskButton({
                mode: 'on',
                progressElem: view.querySelector('.organizeProgress'),
                panel: view.querySelector('.organizeTaskPanel'),
                taskKey: 'AutoOrganize',
                button: view.querySelector('.btnOrganize')
            });
        });

        view.addEventListener('viewhide', function (e) {

            currentResult = null;

            events.off(serverNotifications, 'AutoOrganize_LogReset', onServerEvent);
            events.off(serverNotifications, 'AutoOrganize_ItemUpdated', onServerEvent);
            events.off(serverNotifications, 'AutoOrganize_ItemRemoved', onServerEvent);
            events.off(serverNotifications, 'AutoOrganize_ItemAdded', onServerEvent);
            events.off(serverNotifications, 'ScheduledTaskEnded', onServerEvent);

            // off here
            taskButton({
                mode: 'off',
                button: view.querySelector('.btnOrganize')
            });
        });
    };
});