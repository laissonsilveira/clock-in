angular.module('clockInApp', []).controller('CollectedDataController', ($scope, $http, $filter) => {

    const INITIAL_BALANCE = -95;
    $scope.initialBalance = moment.duration(INITIAL_BALANCE, 'minutes').format('h [hours], m [minutes]');
    const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    $scope.isLogged = false;

    const totalBalanceCalc = (items) => {
        if (items) {
            $scope.balance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalMinutes, 0) + INITIAL_BALANCE;
            $scope.balanceLabel = moment.duration($scope.balance + INITIAL_BALANCE, 'minutes').format('h [hours], m [minutes]');
            
            $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
            $scope.balanceFilterLabel = moment.duration($scope.balanceFilter, 'minutes').format('h [hours], m [minutes]');
            
            $scope.extraBalance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalExtra, 0);
            $scope.extraBalanceLabel = moment.duration($scope.extraBalance, 'minutes').format('h [hours], m [minutes]');
            const resultPercent = $scope.extraBalance * 100 / 15360;//8*5*4*8=1280*20%=256hrs = 15360min
            $scope.extraPercent = Number(resultPercent).toFixed(parseInt(resultPercent) === 0 ? 1 : 0);
        }
    };

    $('input[name="daterange"]').daterangepicker({ autoApply: true, locale: { format: 'DD/MM/YYYY' } });

    $scope.search = item => {
        if (angular.isDefined($scope.query)) {

            const filterDate = angular.copy($scope.query);

            let resultFilterDate;
            if (angular.isDefined(filterDate)) {
                resultFilterDate = item.divergences.find(d => {
                    const dataChangedReplace = filterDate.replace(new RegExp(' ', 'g'), '');
                    const dateChanged = dataChangedReplace.split('-');
                    const dateFrom = dateChanged[0];
                    const dateTo = dateChanged[1];
                    const d1 = dateFrom.split('/');
                    const d2 = dateTo.split('/');
                    const from = new Date(d1[2], d1[1] - 1, d1[0]);
                    const to = new Date(d2[2], d2[1] - 1, d2[0]);
                    const dateCheck = $filter('date')(d.date, 'dd/MM/yyyy');
                    const c = dateCheck.split('/');
                    const check = new Date(c[2], c[1] - 1, c[0]);
                    return check >= from && check <= to;
                });
            }
            return resultFilterDate;
        } else {
            return item;
        }
    };

    $scope.$watchCollection('itemsFiltered', () => {
        totalBalanceCalc($scope.itemsFiltered);
    });

    $scope.login = auth => {
        const authData = encode(`${auth.user}:${auth.password}`);
        $http.defaults.headers.common['Authorization'] = 'Basic ' + authData;

        $http.get('https://clock-in-dgt.herokuapp.com/documents')
        // $http.get('http://localhost:3000/documents')
            .then(response => {
                $('#modal_login').modal('hide');
                $scope.isLogged = true;
                $scope.items = response.data;
                totalBalanceCalc($scope.items);
            })
            .catch(console.error);//eslint-disable-line
    };

    const encode = input => {
        var output = '';
        var chr1, chr2, chr3 = '';
        var enc1, enc2, enc3, enc4 = '';
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                keyStr.charAt(enc1) +
                keyStr.charAt(enc2) +
                keyStr.charAt(enc3) +
                keyStr.charAt(enc4);
            chr1 = chr2 = chr3 = '';
            enc1 = enc2 = enc3 = enc4 = '';
        } while (i < input.length);

        return output;
    };

    $('#modal_login').modal('show');
});