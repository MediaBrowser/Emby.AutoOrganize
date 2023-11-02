define(['ListPage', 'layoutManager', 'ApiClient', 'itemManager', 'BaseItemController', 'globalize', 'connectionManager', 'datetime', 'pluginManager', 'loading', 'formHelper', 'mainTabsManager', 'taskButton', 'events', 'serverNotifications'], function (ListPage, layoutManager, ApiClient, itemManager, BaseItemController, globalize, connectionManager, datetime, pluginManager, loading, formHelper, mainTabsManager, taskButton, events, serverNotifications) {
    'use strict';

    ApiClient.prototype.getFileOrganizationResults = function (options) {

        var url = this.getUrl("Library/FileOrganization", options || {});

        var serverId = this.serverId();

        return this.getJSON(url).then(function (result) {

            var items = result.Items;
            for (var i = 0, length = items.length; i < length; i++) {
                items[i].ServerId = serverId;
            }

            return result;
        });
    };

    ApiClient.prototype.deleteOriginalFileFromOrganizationResult = function (id) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/File");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.prototype.clearOrganizationLog = function () {

        var url = this.getUrl("Library/FileOrganizations");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.prototype.clearOrganizationCompletedLog = function () {

        var url = this.getUrl("Library/FileOrganizations/Completed");

        return this.ajax({
            type: "DELETE",
            url: url
        });
    };

    ApiClient.prototype.performOrganization = function (id) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Organize");

        return this.ajax({
            type: "POST",
            url: url
        });
    };

    ApiClient.prototype.performEpisodeOrganization = function (id, options) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Episode/Organize");

        return this.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    ApiClient.prototype.performMovieOrganization = function (id, options) {

        var url = this.getUrl("Library/FileOrganizations/" + id + "/Movie/Organize");

        return this.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    ApiClient.prototype.getSmartMatchInfos = function (options) {

        options = options || {};

        var url = this.getUrl("Library/FileOrganizations/SmartMatches", options);

        return this.ajax({
            type: "GET",
            url: url,
            dataType: "json"
        });
    };

    ApiClient.prototype.deleteSmartMatchEntries = function (entries) {

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

    function AutoOrganizeEntryController() {

        BaseItemController.apply(this, arguments);
    }

    Object.assign(AutoOrganizeEntryController.prototype, BaseItemController.prototype);

    AutoOrganizeEntryController.prototype.getTypeNames = function () {
        return ['AutoOrganizeEntry'];
    };

    AutoOrganizeEntryController.prototype.getDisplayName = function (item, options) {
        return item.OriginalPath;
    };

    AutoOrganizeEntryController.prototype.isSingleItemFetchRequired = function (typeName) {
        return false;
    };

    AutoOrganizeEntryController.prototype.getDefaultIcon = function (item) {

        return '&#xe873;';
    };

    AutoOrganizeEntryController.prototype.canDelete = function (item, user) {

        return item.Status !== 'Success';
    };

    AutoOrganizeEntryController.prototype.enableLibraryItemDeleteConfirmation = function () {

        return false;
    };

    AutoOrganizeEntryController.prototype.canRate = function (item) {
        return false;
    };

    AutoOrganizeEntryController.prototype.canMarkPlayed = function (item) {
        return false;
    };

    AutoOrganizeEntryController.prototype.canAddToPlaylist = function (item) {

        return false;
    };

    AutoOrganizeEntryController.prototype.canAddToCollection = function (item, user) {

        return false;
    };

    AutoOrganizeEntryController.prototype.canConvert = function (item, user) {

        return false;
    };

    AutoOrganizeEntryController.prototype.canEdit = function (items, user) {

        if (items.length === 1) {
            return items[0].Status !== 'Success';
        }

        return false;
    };

    AutoOrganizeEntryController.prototype.canEditImages = function (item, user) {

        return false;
    };

    AutoOrganizeEntryController.prototype.canEditSubtitles = function (item, user) {

        return false;
    };

    AutoOrganizeEntryController.prototype.getEditCommand = function (items) {

        let cmd = BaseItemController.prototype.getEditCommand.apply(this, arguments);

        cmd.name = globalize.translate('Organize');
        cmd.icon = 'drive_file_move';
        cmd.primaryCommand = true

        return cmd;
    };

    AutoOrganizeEntryController.prototype.getEditCommandText = function (item) {

        return globalize.translate('Organize');
    };
    AutoOrganizeEntryController.prototype.isDeletePrimaryCommand = function (itemType) {

        return true;
    };

    AutoOrganizeEntryController.prototype.getNameSortOption = function (itemType) {

        return null;
    };

    AutoOrganizeEntryController.prototype.getDeleteMessages = function () {

        return {
            single: {
                text: 'Delete file?',
                title: 'Delete Auto Organize Entry',
                confirmText: globalize.translate('Delete')
            },
            plural: {
                text: 'Delete files?',
                title: 'Delete Auto Organize Entry',
                confirmText: globalize.translate('Delete')
            }
        };
    };

    AutoOrganizeEntryController.prototype.canRefreshMetadata = function (item, user) {

        return false;
    };

    AutoOrganizeEntryController.prototype.getAvailableFields = function (options) {

        let fields = BaseItemController.prototype.getAvailableFields.apply(this, arguments);

        fields = [];

        fields.push({
            id: 'Name',
            name: globalize.translate('Path'),
            size: 80,
            sortBy: null,
            viewTypes: 'datagrid'
        });

        fields.push({
            id: 'OriginalFileName',
            name: globalize.translate('FileName'),
            size: 40,
            sortBy: null,
            defaultVisible: '*'
        });

        fields.push({
            id: 'TargetPath',
            name: globalize.translate('Target Path'),
            size: 80,
            sortBy: null,
            defaultVisible: 'datagrid'
        });

        fields.push({
            id: 'DateOrganized',
            name: globalize.translate('Date'),
            size: 20,
            sortBy: null,
            defaultVisible: 'datagrid'
        });

        fields.push({
            id: 'StatusDisplay',
            name: globalize.translate('Status'),
            size: 12,
            sortBy: null,
            viewTypes: 'datagrid',
            defaultVisible: 'datagrid'
        });

        fields.push({
            id: 'StatusMessage',
            name: globalize.translate('Status Message'),
            size: 80,
            sortBy: null,
            viewTypes: 'datagrid',
            defaultVisible: 'datagrid'
        });

        return fields;
    };

    AutoOrganizeEntryController.prototype.getCommands = function (options) {
        let commands = BaseItemController.prototype.getCommands.apply(this, arguments);

        let items = options.items;

        if (items.length === 1) {

            if (items[0].Status !== 'Success') {
                commands.push({
                    name: globalize.translate('View Error Information'),
                    id: 'viewerrorinfo',
                    icon: 'error'
                });
            }
        }

        return commands;
    };

    function showErrorInfoForEntry(item) {

        require(['alert']).then(function (responses) {

            return responses[0]({

                title: item.OriginalFileName,
                text: item.StatusMessage

            });
        });
        return Promise.resolve();
    }

    AutoOrganizeEntryController.prototype.executeCommand = function (command, items, options) {

        switch (command) {

            case 'viewerrorinfo':
                return showErrorInfoForEntry(items[0]);
            default:
                return BaseItemController.prototype.executeCommand.apply(this, arguments);
        }
    };

    AutoOrganizeEntryController.prototype.deleteItemsInternal = function (options) {

        const apiClient = connectionManager.getApiClient(options.items[0]);
        let promises = options.items.map(function (item) {
            return apiClient.deleteOriginalFileFromOrganizationResult(item.Id);
        });

        return Promise.all(promises);
    };

    AutoOrganizeEntryController.prototype.editItems = function (items, options) {

        var item = items[0];

        if (!item.TargetPath) {
            return require([pluginManager.getConfigurationResourceUrl('FileOrganizerJs')]).then(function (responses) {

                return responses[0].show(item);
            });
        }

        var message = 'The following file will be moved from:' + '<br/><br/>' + item.OriginalPath + '<br/><br/>' + 'To:' + '<br/><br/>' + item.TargetPath;

        if (item.DuplicatePaths.length) {
            message += '<br/><br/>' + 'The following duplicates will be deleted:';

            message += '<br/><br/>' + item.DuplicatePaths.join('<br/>');
        }

        message += '<br/><br/>' + 'Are you sure you wish to proceed?';

        return require(['confirm']).then(function (responses) {

            return responses[0](message, 'Organize File').then(function () {

                loading.show();

                return ApiClient.performOrganization(item.Id).then(function () {

                    loading.hide();

                }, formHelper.handleErrorResponse);
            });
        });
    };

    function getStatusDisplay(item) {

        var status = item.Status;
        let classes = [];
        let styles = [];

        if (status === 'SkippedExisting') {
            status = 'Skipped';
        }
        else if (status === 'Failure') {
            status = 'Failed';
            styles.push('color:red');
        }
        if (status === 'Success') {
            status = 'Success';
            classes.push('color-accent');
        }

        return '<span class="' + classes.join(' ') + '" style="' + styles.join(';') + '">' + status + '</span>';
    }

    AutoOrganizeEntryController.prototype.resolveField = function (item, field) {

        switch (field) {

            case 'ListViewTargetPath':
                return item.TargetPath ? ('<i class="md-icon autortl" style="font-size:150%;margin-inline-end:.5em;">arrow_forward</i>' + item.TargetPath) : null;
            case 'StatusDisplay':
                return getStatusDisplay(item);
            case 'DateOrganized':
                {
                    let val = item.Date;
                    return val ? datetime.toLocaleString(new Date(Date.parse(val))) : null;
                }
            case 'ListViewStatusMessage':
                return getStatusDisplay(item) + ': ' + item.StatusMessage;
            default:
                return BaseItemController.prototype.resolveField.apply(this, arguments);
        }
    };

    itemManager.registerItemController(new AutoOrganizeEntryController());

    function getTabs() {
        return [
            {
                href: pluginManager.getConfigurationPageUrl('AutoOrganizeLog'),
                name: 'Activity Log'
            },
            {
                href: pluginManager.getConfigurationPageUrl('AutoOrganizeTv'),
                name: 'TV'
            },
            {
                href: pluginManager.getConfigurationPageUrl('AutoOrganizeMovie'),
                name: 'Movie'
            },
            {
                href: pluginManager.getConfigurationPageUrl('AutoOrganizeSmart'),
                name: 'Smart Matches'
            }];
    }

    function onServerEvent(e, apiClient, data) {

        let refresh = true;

        if (e.type === 'ScheduledTasksInfo') {
            // todo filte 

        } else {

            refresh = true;
        }

        if (refresh) {
            this.itemsContainer.notifyRefreshNeeded(true);
        }
    }

    function AutoOrganizeView(view, params) {

        this.enableAlphaNumericShortcuts = false;

        ListPage.apply(this, arguments);

        const instance = this;

        view.querySelector('.btnClearLog').addEventListener('click', function () {

            instance.getApiClient().clearOrganizationLog().then(function () {

                instance.itemsContainer.notifyRefreshNeeded(true);

            }, formHelper.handleErrorResponse);
        });

        view.querySelector('.btnClearCompleted').addEventListener('click', function () {

            instance.getApiClient().clearOrganizationCompletedLog().then(function () {

                instance.itemsContainer.notifyRefreshNeeded(true);

            }, formHelper.handleErrorResponse);
        });

        this.boundOnServerEvent = onServerEvent.bind(this);
    }

    Object.assign(AutoOrganizeView.prototype, ListPage.prototype);

    AutoOrganizeView.prototype.onResume = function (options) {

        ListPage.prototype.onResume.apply(this, arguments);

        var view = this.view;

        mainTabsManager.setTabs(view, 0, getTabs);

        events.on(serverNotifications, 'AutoOrganize_LogReset', this.boundOnServerEvent);
        events.on(serverNotifications, 'AutoOrganize_ItemUpdated', this.boundOnServerEvent);
        events.on(serverNotifications, 'AutoOrganize_ItemRemoved', this.boundOnServerEvent);
        events.on(serverNotifications, 'AutoOrganize_ItemAdded', this.boundOnServerEvent);
        events.on(serverNotifications, 'ScheduledTasksInfo', this.boundOnServerEvent);

        // on here
        taskButton({
            mode: 'on',
            panel: view.querySelector('.btnOrganize'),
            progressElem: view.querySelector('.organizeProgress'),
            taskKey: 'AutoOrganize',
            button: view.querySelector('.btnOrganize')
        });
    };

    AutoOrganizeView.prototype.onPause = function () {

        ListPage.prototype.onPause.apply(this, arguments);

        var view = this.view;

        events.off(serverNotifications, 'AutoOrganize_LogReset', this.boundOnServerEvent);
        events.off(serverNotifications, 'AutoOrganize_ItemUpdated', this.boundOnServerEvent);
        events.off(serverNotifications, 'AutoOrganize_ItemRemoved', this.boundOnServerEvent);
        events.off(serverNotifications, 'AutoOrganize_ItemAdded', this.boundOnServerEvent);
        events.off(serverNotifications, 'ScheduledTasksInfo', this.boundOnServerEvent);

        // off here
        taskButton({
            mode: 'off',
            panel: view.querySelector('.organizeTaskPanel'),
            progressElem: view.querySelector('.organizeProgress'),
            taskKey: 'AutoOrganize',
            button: view.querySelector('.btnOrganize')
        });
    };

    AutoOrganizeView.prototype.supportsAlphaPicker = function () {

        return false;
    };

    AutoOrganizeView.prototype.getItemTypes = function () {

        return ['AutoOrganizeEntry'];
    };

    AutoOrganizeView.prototype.getEmptyListMessage = function () {

        return Promise.resolve('');
    };

    AutoOrganizeView.prototype.setTitle = function () {

        // handled by appheader
    };

    AutoOrganizeView.prototype.getItem = function () {

        return Promise.resolve(null);
    };

    AutoOrganizeView.prototype.getItems = function (query) {

        return this.getApiClient().getFileOrganizationResults(query);
    };

    AutoOrganizeView.prototype.getNameSortOption = function (itemType) {

        return null;
    };

    AutoOrganizeView.prototype.getSettingsKey = function () {

        return 'autoorganizelog';
    };

    AutoOrganizeView.prototype.supportsViewType = function (viewType) {

        switch (viewType) {

            case 'datagrid':
            case 'list':
                return true;
            default:
                return false;
        }
    };

    AutoOrganizeView.prototype.getBaseListRendererOptions = function () {

        let options = ListPage.prototype.getBaseListRendererOptions.apply(this, arguments);

        options.draggable = false;
        options.draggableXActions = true;

        options.action = layoutManager.tv ? 'none' : 'edit';

        options.textLinks = false;

        return options;
    };

    AutoOrganizeView.prototype.getListViewOptions = function (items, settings) {

        let options = ListPage.prototype.getListViewOptions.apply(this, arguments);

        options.fields.push('ListViewTargetPath');
        options.fields.push('DateOrganized');
        options.fields.push('ListViewStatusMessage');

        return options;
    };

    AutoOrganizeView.prototype.getViewSettingDefaults = function () {

        let viewSettings = ListPage.prototype.getViewSettingDefaults.apply(this, arguments);

        viewSettings.imageType = 'list';

        return viewSettings;
    };

    return AutoOrganizeView;
});