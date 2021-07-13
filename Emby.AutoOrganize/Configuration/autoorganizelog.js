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

    ApiClient.performOrganization = function (id, options) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Organize");

        return this.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(options),
            contentType: 'application/json'
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

        var message = 'The following file will be moved from:' + '<br/><br/>' + item.OriginalPath + '<br/><br/>' + 'To:' + '<br/><br/>' + item.TargetPath;

        if (item.DuplicatePaths.length) {
            message += '<br/><br/>' + 'The following duplicates will be deleted:';

            message += '<br/><br/>' + item.DuplicatePaths.join('<br/>');
        }

        message += '<br/><br/>' + 'Are you sure you wish to proceed?';

        require(['confirm'], function (confirm) {

            confirm(message, 'Organize File').then(function () {

                loading.show();
                var options = {
                    RequestToOverwriteExistsingFile: true
                }
                ApiClient.performOrganization(id, options).then(function () {

                    loading.hide();

                    reloadItems(page, true);

                }, reloadItems(page, false));
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
        });
    }

    function getStatusText(item, enhance) {

        var status = item.Status;

        var color = null;

        if (status === 'SkippedExisting') {
            status = 'Skipped';
        }
        else if (status === 'Failure') {
            color = '#cc0000';
            status = 'Attention';
        }
        if (status === 'Success') {
            color = 'green';
            status = 'Success';
        }
        if (status === "Processing") {
            color = 'green';
            status = "Processing"
        }
        if (status === "Waiting") {
            color = 'blue';
            status = "Waiting"
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

                html += renderItemRow(item, page);

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

    function getButtonSvgIconRenderData(btn_icon) {
        switch (btn_icon) {
            case 'IdentifyBtn': return { path: "M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19H5V5H12V3H5M17.78,4C17.61,4 17.43,4.07 17.3,4.2L16.08,5.41L18.58,7.91L19.8,6.7C20.06,6.44 20.06,6 19.8,5.75L18.25,4.2C18.12,4.07 17.95,4 17.78,4M15.37,6.12L8,13.5V16H10.5L17.87,8.62L15.37,6.12Z", color: 'black' }
            case 'DeleteBtn': return { path: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z", color: 'black' };
            case 'ProcessBtn': return { path: "M14 2H6C4.9 2 4 2.9 4 4V20C4 20.41 4.12 20.8 4.34 21.12C4.41 21.23 4.5 21.33 4.59 21.41C4.95 21.78 5.45 22 6 22H13.53C13 21.42 12.61 20.75 12.35 20H6V4H13V9H18V12C18.7 12 19.37 12.12 20 12.34V8L14 2M18 23L23 18.5L20 15.8L18 14V17H14V20H18V23Z", color: 'black' }
        }
    }
    function getStatusRenderData(status) {
        switch (status) {
            case 'Success': return {
                path: "M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
                color: "green",
                text: "Complete"
            };                                    
            case 'Failure': return {
                path: "M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z",
                color: "orangered",
                text: "Attention - Unidentified"
            };
            case 'SkippedExisting': return {
                path: "M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z",
                color: "goldenrod",
                text: "Attention - Existing Item"
            };
            case 'Processing': return {
                path: "M12 20C16.4 20 20 16.4 20 12S16.4 4 12 4 4 7.6 4 12 7.6 20 12 20M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2M15.3 16.2L14 17L11 11.8V7H12.5V11.4L15.3 16.2Z",
                color: "var(--theme-accent-text-color)",
                text: "Processing..."
            };             
            case "Waiting": return {
                path: "M12 20C16.4 20 20 16.4 20 12S16.4 4 12 4 4 7.6 4 12 7.6 20 12 20M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2M15.3 16.2L14 17L11 11.8V7H12.5V11.4L15.3 16.2Z",
                color: "goldenrod",
                text: "Waiting...File currently in use"
            };
        }
    }

    function renderItemRow(item, page) {

        var html = '';
        var statusRenderData = item.IsInProgress && item.Status !== "Processing" ? getStatusRenderData("Waiting") : getStatusRenderData(item.Status);
        
        //Progress Icon
        html += '<td class="detailTableBodyCell">';           
        html += '<div class="progressIcon">';
        html += '<svg id="statusIcon" style="width:24px;height:24px" viewBox="0 0 24 24">';
        html += '<path fill="' + statusRenderData.color + '" d="' + statusRenderData.path + '"/>';
        html += '</svg>';
        html += '</div>';
        html += '</td>';
                      

        //Date
        html += '<td class="detailTableBodyCell" data-title="Date">';
        var date = datetime.parseISO8601Date(item.Date, true);
        html += datetime.toLocaleDateString(date);
        html += '</td>';


        //Status
        html += '<td data-resultid="' + item.Id + '" class= class="detailTableBodyCell fileCell">';
        html += '<span>' + statusRenderData.text + '</span>';
        html += '</td>';

        //Source
        html += '<td data-title="Source" class="detailTableBodyCell fileCell">';
        html += '<a is="emby-linkbutton" data-resultid="' + item.Id + '" style="color:' + statusRenderData.color + ';" href="#" class="button-link btnShowStatusMessage">';
        html += item.OriginalFileName;
        html += '</a>';
        html += '</td>';

        //Destination
        html += '<td data-title="Destination" class="detailTableBodyCell fileCell">';
        html += item.TargetPath || '';
        html += '</td>';

        //Row buttons
        html += '<td class="detailTableBodyCell organizerButtonCell" style="whitespace:no-wrap;">';
        if (item.Status == "Waiting") {
            html += '';
        } else {
            if (item.Status !== 'Success') {

                if (item.Status !== "Processing") {
                    //Idenify Entry Button - This opens the Identify/Lookup modal for the item.
                    //We want to show this option if the item has been skipped because we think it alrerady exists, or the item failed to find a match.
                    //There is a chance that the Lookup was incorrect if there was a match to an existing item.
                    //Allow the user to identify the item.
                    if (item.Status === "SkippedExisting" || item.Status === "Failure") {
                        var identifyBtn = getButtonSvgIconRenderData("IdentifyBtn");
                        html += '<button type="button" is="paper-icon-button-light" data-resultid="' + item.Id + '" class="btnIdentifyResult organizerButton autoSize" title="Identify">';
                        html += '<svg style="width:24px;height:24px" viewBox="0 0 24 24">';
                        html += '<path fill="' + identifyBtn.color + '" d="' + identifyBtn.path + '"/>';
                        html += '</svg>';
                        html += '</button>';
                    }
                    
                    //Process Entry Button - This will process the item into the library based on the info in the "Destination" column of the table row.
                    //Only show this button option if: it is not a Success, not Processing, and has not failed to find a possible result.
                    //The "Destination" column info will be populated.
                    if (item.Status !== "Failure") {                         
                        var processBtn = getButtonSvgIconRenderData("ProcessBtn");
                        html += '<button type="button" is="paper-icon-button-light" data-resultid="' + item.Id + '" class="btnProcessResult organizerButton autoSize" title="Organize">';
                        html += '<svg style="width:24px;height:24px" viewBox="0 0 24 24">';
                        html += '<path fill="' + processBtn.color + '" d="' + processBtn.path + '"/>';
                        html += '</svg>';
                        html += '</button>';
                    }
                }
                //Delete Entry Button - This deletes the item from the log window and removes it from watched folder
                var deleteBtn = getButtonSvgIconRenderData("DeleteBtn");
                html += '<button type="button" is="paper-icon-button-light" data-resultid="' + item.Id + '" class="btnDeleteResult organizerButton autoSize" title="Delete">';
                html += '<svg style="width:24px;height:24px" viewBox="0 0 24 24">';
                html += '<path fill="' + deleteBtn.color + '" d="' + deleteBtn.path + '"/>';
                html += '</svg>';
                html += '</button>';
            }
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

        var identifyOrganize = parentWithClass(e.target, "btnIdentifyResult");
        if (identifyOrganize) {

            id = identifyOrganize.getAttribute('data-resultid');           
            var item = currentResult.Items.filter(function (i) { return i.Id === id; })[0];
            showCorrectionPopup(e.view, item);
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

        var buttonRemoveSmartMatchResult  = parentWithClass(e.target, 'btnRemoveSmartMatchResult');
        if (buttonRemoveSmartMatchResult) {

            id = buttonRemoveSmartMatchResult.getAttribute('data-resultid');

             var smartMatchEntryList =  getSmartMatchInfos();
             var smartMatchListItemValue = "";
            
            smartMatchEntryList.forEach(item => {
                if (item.Name == id) {
                    smartMatchListItemValue == item.Value;
                }
            })

            var entries = [
                    {
                        Name: id,
                        Value: smartMatchListItemValue
                    }];
            deleteSmartMatchEntries(entries)
        }
    }

    function onServerEvent(e, apiClient, data) {

        if (e.type === 'ScheduledTaskEnded') {

            if (data && data.Key === 'AutoOrganize') {
                reloadItems(pageGlobal, false);
            }        

        } else if (e.type === 'AutoOrganize_ItemUpdated' && data) {

            updateItemStatus(pageGlobal, data);

        } else if (e.type === 'AutoOrganize_ItemAdded' && data) {

            reloadItems(pageGlobal, false);

        } else {

            reloadItems(pageGlobal, false);

        }
    }

    function updateItemStatus(page, item) {

        var rowId = '#row' + item.Id;
        var row = page.querySelector(rowId);

        if (row) {

            row.innerHTML = renderItemRow(item, page);

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
            events.on(serverNotifications, "ScheduledTaskStarted", onServerEvent)
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
            events.off(serverNotifications, "ScheduledTaskStarted", onServerEvent)

            // off here
            taskButton({
                mode: 'off',
                button: view.querySelector('.btnOrganize')
            });
        });
    };
});