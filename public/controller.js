angular.module('clockInApp', ['angular-loading-bar']).controller('CollectedDataController', ($scope, $http, $filter) => {

    const INITIAL_BALANCE = -95;
    const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    $scope.isLogged = false;

    const totalBalanceCalc = (items) => {
        if (items) {
            $scope.initialBalance = moment.duration(INITIAL_BALANCE, 'minutes').format('h [hours], m [minutes]');

            $scope.balance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalMinutes, 0) + INITIAL_BALANCE;
            $scope.balanceLabel = moment.duration($scope.balance, 'minutes').format('h [hours], m [minutes]');

            $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
            $scope.balanceFilterLabel = moment.duration($scope.balanceFilter, 'minutes').format('h [hours], m [minutes]');

            $scope.extraAcelerationBalance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalExtraAceleration, 0);
            $scope.extraAcelerationBalanceLabel = moment.duration($scope.extraAcelerationBalance, 'minutes').format('h [hours], m [minutes]');
            //8(hrs)*5(dias)*4(semanas)*8(meses)=1280(hrs)*20%=256(hrs) = 15360min[20%] -> 76800min[100%]
            const resultPercent = $scope.extraAcelerationBalance * 100 / 76800;
            $scope.extraPercent = Number(resultPercent).toFixed(parseInt(resultPercent) === 0 ? 1 : 0);

            $scope.extraBalance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalExtra, 0);
            $scope.extraBalanceLabel = moment.duration($scope.extraBalance, 'minutes').format('h [hours], m [minutes]');
        }
    };

    const clearHours = () => {
        $scope.date = new Date();
        $scope.hour01 = { time: new Date(1970, 0, 1, 8, 0, 0) };
        $scope.hour02 = { time: new Date(1970, 0, 1, 12, 0, 0) };
        $scope.hour03 = { time: new Date(1970, 0, 1, 13, 30, 0) };
        $scope.hour04 = { time: new Date(1970, 0, 1, 17, 30, 0) };
        $scope.hour05 = {};
        $scope.hour06 = {};
        $scope.divergence = {
            positive: [],
            negative: [],
            extra: [],
            extraAceleration: []
        };
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

    const saveHours = (divergence, hour) => {
        if (!hour.time) return;
        const time = $filter('date')(hour.time, 'HH:mm');
        switch (hour.type) {
            case 'P':
                divergence.positive.push(time);
                break;
            case 'N':
                divergence.negative.push(time);
                break;
            case 'E':
                divergence.extra.push(time);
                break;
            case 'A':
                divergence.extraAceleration.push(time);
                break;

            default:
                break;
        }
        return time;
    };

    const getClocks = (auth) => {
        return $http.get('clocks')
            .then(response => {
                sessionStorage.user = auth.user;
                sessionStorage.password = auth.password;
                $('#modal_login').modal('hide');
                $scope.isLogged = true;
                $scope.items = response.data;
                totalBalanceCalc($scope.items);
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = `Usuário '${auth.user}' não tem acesso`;
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
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
                    const dateCheck = $filter('date')(moment(d.date, ['dddd, MMMM DD, YYYY']).format('DD/MM/YYYY'), 'dd/MM/yyyy');
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
        getClocks(auth);
    };

    $scope.onSaveHours = () => {
        const times = [];
        const clockIn = {
            date_created: $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            divergences: []
        };
        times.push(saveHours($scope.divergence, $scope.hour01));
        times.push(saveHours($scope.divergence, $scope.hour02));
        times.push(saveHours($scope.divergence, $scope.hour03));
        times.push(saveHours($scope.divergence, $scope.hour04));
        times.push(saveHours($scope.divergence, $scope.hour05));
        times.push(saveHours($scope.divergence, $scope.hour06));

        $scope.divergence.date = $filter('date')($scope.date, 'EEEE, dd/MM/yyyy');
        $scope.divergence.hours = times.join(' ').trim();
        clockIn.divergences.push($scope.divergence);

        $http.post('clocks', clockIn)
            .then(response => {
                if (response.status === 200) {
                    getClocks({ user: sessionStorage.user, password: sessionStorage.password }).then(() => $('#modal_add').modal('hide'));
                } else {
                    alert('Erro interno, consulte o log ;)');
                }
            })
            .catch(err => {
                alert('Erro interno, consulte o log ;)');
                console.error(err);//eslint-disable-line
            });
    };

    $('#modal_add').on('show.bs.modal', () => {
        clearHours();
        $scope.$apply();
    });

    $scope.onDelete = id => {
        if(confirm('Confirma delete???')) {
            $http.delete(`clocks/${id}`)
            .then(response => {
                if (response.status === 200) {
                    getClocks({ user: sessionStorage.user, password: sessionStorage.password });
                } else {
                    alert('Erro interno, consulte o log ;)');
                }
            })
            .catch(err => {
                alert('Erro interno, consulte o log ;)');
                console.error(err);//eslint-disable-line
            });
        }
    };

    clearHours();
    // $scope.isLogged = true;
    sessionStorage.user ? $scope.login({ user: sessionStorage.user, password: sessionStorage.password }) : $('#modal_login').modal('show');
}).config(['cfpLoadingBarProvider', (cfpLoadingBarProvider) => {
    cfpLoadingBarProvider.includeSpinner = false;
}]);