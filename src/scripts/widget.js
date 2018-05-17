/*
 * The MIT License
 *
 * Copyright (c) 2015, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

angular.module('adf')
    .directive('adfWidget', function ($log, $modal, dashboard, adfTemplatePath) {

        function preLink($scope) {
            var definition = $scope.definition;

            //passs translate function from dashboard so we can translate labels inside html templates
            $scope.translate = dashboard.translate;

            if (definition) {
                var w = dashboard.widgets[definition.type];
                if (w) {
                    // pass title
                    if (!definition.title) {
                        definition.title = w.title;
                    }

                    if (!definition.titleTemplateUrl) {
                        definition.titleTemplateUrl = adfTemplatePath + 'widget-title.html';
                        if (w.titleTemplateUrl) {
                            definition.titleTemplateUrl = w.titleTemplateUrl;
                        }
                    }
                    if (!definition.deleteTemplateUrl) {
                        definition.deleteTemplateUrl = adfTemplatePath + 'widget-delete.html';
                        if (w.deleteTemplateUrl) {
                            definition.deleteTemplateUrl = w.deleteTemplateUrl;
                        }
                    }
                    if (!definition.editTemplateUrl) {
                        definition.editTemplateUrl = adfTemplatePath + 'widget-edit.html';
                        if (w.editTemplateUrl) {
                            definition.editTemplateUrl = w.editTemplateUrl;
                        }
                    }
                    if (!definition.fullscreenTemplateUrl) {
                        definition.fullscreenTemplateUrl = adfTemplatePath + 'widget-fullscreen.html';
                        if (w.fullscreenTemplateUrl) {
                            definition.fullscreenTemplateUrl = w.fullscreenTemplateUrl;
                        }
                    }


                    // set id for sortable
                    if (!definition.wid) {
                        definition.wid = dashboard.id();
                    }

                    // pass copy of widget to scope
                    $scope.widget = angular.copy(w);

                    // create config object
                    var config = definition.config;
                    if (config) {
                        if (angular.isString(config)) {
                            config = angular.fromJson(config);
                        }
                    } else {
                        config = {};
                    }

                    // pass config to scope
                    $scope.config = config;

                    // collapse exposed $scope.widgetState property
                    if (!$scope.widgetState) {
                        $scope.widgetState = {};
                        $scope.widgetState.isCollapsed = false;
                    }

                } else {
                    $log.warn('could not find widget ' + definition.type);
                }
            } else {
                $log.debug('definition not specified, widget was probably removed');
            }
        }

        function postLink($scope, $element) {
            var definition = $scope.definition;
            if (definition) {
                // bind close function

                var deleteWidget = function () {
                    var column = $scope.col;
                    if (column) {
                        var index = column.widgets.indexOf(definition);
                        if (index >= 0) {
                            column.widgets.splice(index, 1);
                        }
                    }
                    $element.remove();
                };
                $scope.remove = function () {
                    if ($scope.options.enableConfirmDelete) {
                        var deleteScope = $scope.$new();
                        deleteScope.translate = dashboard.translate;

                        var adfDeleteTemplatePath = (definition.deleteTemplateUrl) ? definition.deleteTemplateUrl
                            : adfTemplatePath + 'widget-delete.html';

                        var opts = {
                            scope: deleteScope,
                            templateUrl: adfDeleteTemplatePath,
                            backdrop: 'static'
                        };
                        var instance = $modal.open(opts);

                        deleteScope.closeDialog = function () {
                            instance.close();
                            deleteScope.$destroy();
                        };
                        deleteScope.deleteDialog = function () {
                            deleteWidget();
                            deleteScope.closeDialog();
                        };
                    }
                    else {
                        deleteWidget();
                    }
                };

                // bind reload function
                $scope.reload = function () {
                    $scope.$broadcast('widgetReload');
                };

                // bind edit function
                $scope.edit = function () {
                    var editScope = $scope.$new();
                    editScope.translate = dashboard.translate;
                    editScope.definition = angular.copy(definition);

                    var adfEditTemplatePath = (definition.editTemplateUrl) ? definition.editTemplateUrl
                        : adfTemplatePath + 'widget-edit.html';

                    var opts = {
                        scope: editScope,
                        templateUrl: adfEditTemplatePath,
                        backdrop: 'static'
                    };

                    var instance = $modal.open(opts);
                    editScope.closeDialog = function () {
                        instance.close();
                        editScope.$destroy();

                        var widget = $scope.widget;
                        if (widget.edit && widget.edit.reload) {
                            // reload content after edit dialog is closed
                            $scope.$broadcast('widgetConfigChanged');
                        }
                    };
                    editScope.saveDialog = function () {
                        definition.title = editScope.definition.title;
                        angular.extend(definition.config, editScope.definition.config);
                        editScope.closeDialog();
                    };
                };
            } else {
                $log.debug('widget not found');
            }
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            templateUrl: dashboard.customWidgetTemplatePath ? dashboard.customWidgetTemplatePath : adfTemplatePath + 'widget.html',
            scope: {
                definition: '=',
                col: '=column',
                editMode: '=',
                options: '=',
                widgetState: '='
            },

            controller: function ($scope) {

                $scope.$on("adfDashboardCollapseExapand", function (event, args) {
                    $scope.widgetState.isCollapsed = args.collapseExpandStatus;
                });

                $scope.openFullScreen = function () {
                    var definition = $scope.definition;
                    var fullScreenScope = $scope.$new();
                    fullScreenScope.translate = dashboard.translate;

                    var fullscreenTemplateUrl = (definition.fullscreenTemplateUrl) ? definition.fullscreenTemplateUrl
                        : adfTemplatePath + 'widget-fullscreen.html';

                    var opts = {
                        scope: fullScreenScope,
                        templateUrl: fullscreenTemplateUrl,
                        size: definition.modalSize || 'lg', // 'sm', 'lg'
                        backdrop: 'static',
                        windowClass: (definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    var instance = $modal.open(opts);
                    fullScreenScope.closeDialog = function () {
                        instance.close();
                        fullScreenScope.$destroy();
                    };
                };
            },

            compile: function compile() {

                /**
                 * use pre link, because link of widget-content
                 * is executed before post link widget
                 */
                return {
                    pre: preLink,
                    post: postLink
                };
            }
        };

    });
