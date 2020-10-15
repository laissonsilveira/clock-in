angular.module('clockInApp', ['angular-loading-bar']).controller('CollectedDataController', ($scope, $http, $filter) => {

    const INITIAL_BALANCE = -95;
    const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    $scope.isLogged = false;
    $scope.date = new Date();

    const totalBalanceCalc = (clockIn, isFilter) => {
        if (clockIn) {
            $scope.initialBalance = moment.duration(INITIAL_BALANCE, 'minutes').format('h [hours], m [minutes]');

            if (isFilter) {
                $scope.balance = clockIn.reduce((previousVal, currentVal) => previousVal + currentVal.minutes, 0) + INITIAL_BALANCE;
                $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
                $scope.extraBalance = clockIn.reduce((previousVal, currentVal) => previousVal + currentVal.extraHour, 0);

            } else {
                $scope.balance = (clockIn.totalMinutes || 0) + INITIAL_BALANCE;
                $scope.balanceFilter = $scope.balance - INITIAL_BALANCE;
                $scope.extraBalance = clockIn.totalExtra || 0;
            }

            $scope.balanceLabel = moment.duration($scope.balance, 'minutes').format('h [hours], m [minutes]');
            $scope.balanceFilterLabel = moment.duration($scope.balanceFilter, 'minutes').format('h [hours], m [minutes]');
            $scope.extraBalanceLabel = moment.duration($scope.extraBalance, 'minutes').format('h [hours], m [minutes]');

            // $scope.extraAcelerationBalance = items.reduce((previousVal, currentVal) => previousVal + currentVal.totalExtraAceleration, 0);
            // $scope.extraAcelerationBalanceLabel = moment.duration($scope.extraAcelerationBalance, 'minutes').format('h [hours], m [minutes]');
            // //8(hrs)*5(dias)*4(semanas)*8(meses)=1280(hrs)*20%=256(hrs) = 15360min[20%] -> 76800min[100%]
            // const resultPercent = $scope.extraAcelerationBalance * 100 / 76800;
            // $scope.extraPercent = Number(resultPercent).toFixed(parseInt(resultPercent) === 0 ? 1 : 0);
        }
    };

    const clearHours = () => {
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
            extraAceleration: [],
            nextDay: [],
            worked_hours: '8'
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

        if (hour.isNextDay)
            divergence.nextDay.push(time);

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

    const getType = (hour, divergence) => {
        const { negative, positive, extra, extraAceleration } = divergence;

        if (hour) {
            if (Array.isArray(negative) && negative.includes(hour))
                return 'N';
            if (Array.isArray(positive) && positive.includes(hour))
                return 'P';
            if (Array.isArray(extra) && extra.includes(hour))
                return 'E';
            if (Array.isArray(extraAceleration) && negative.includes(hour))
                return 'A';
        }

    };

    const isNextDay = (hour, divergence) => {
        const { nextDay } = divergence;
        return hour && Array.isArray(nextDay) && nextDay.includes(hour);
    };

    const getClocks = () => {
        return $http.get('clocks')
            .then(response => {
                $scope.items = response.data.divergences;
                totalBalanceCalc(response.data);
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = 'Usuário sem acesso';
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
    };

    $('input[name="daterange"]').daterangepicker({ autoApply: true, locale: { format: 'DD/MM/YYYY' } });

    $scope.setHours = () => {
        if ($scope.divergence.worked_hours === '8') {
            $scope.hour01 = { time: new Date(1970, 0, 1, 8, 0, 0) };
            $scope.hour04 = { time: new Date(1970, 0, 1, 17, 30, 0) };
        } else {
            $scope.hour01 = { time: new Date(1970, 0, 1, 9, 0, 0) };
            $scope.hour04 = { time: new Date(1970, 0, 1, 16, 30, 0) };
        }
    };

    $scope.getClockByDate = () => {
        clearHours();
        const today = $filter('date')($scope.date, 'EEEE, dd/MM/yyyy');
        return $http.get(`clocks?date=${today}`)
            .then(response => {
                const divergence = response.data;
                if (divergence) {
                    $scope.divergence.worked_hours = divergence.worked_hours;
                    const { hours: strHours } = divergence;
                    const arrHours = strHours.split(' ');
                    for (let index = 0; index < arrHours.length; index++) {
                        const hour = arrHours[index];
                        const hours = hour.split(':');
                        $scope[`hour0${index + 1}`].time = new Date(1970, 0, 1, hours[0], hours[1], 0);
                        $scope[`hour0${index + 1}`].type = getType(hour, divergence);
                        $scope[`hour0${index + 1}`].isNextDay = isNextDay(hour, divergence);
                    }
                }
            })
            .catch(err => {
                let msg = 'Erro interno, consulte o log ;)';
                if (err.status === 403)
                    msg = 'Usuário sem acesso';
                alert(msg);
                console.error(err); //eslint-disable-line
                $('#modal_login').modal('show');
            });
    };

    $scope.search = divergence => {
        if (angular.isDefined($scope.query)) {

            const filterDate = angular.copy($scope.query);

            let resultFilterDate;
            if (angular.isDefined(filterDate)) {
                const dataChangedReplace = filterDate.replace(new RegExp(' ', 'g'), '');
                const dateChanged = dataChangedReplace.split('-');
                const dateFrom = dateChanged[0];
                const dateTo = dateChanged[1];
                const d1 = dateFrom.split('/');
                const d2 = dateTo.split('/');
                const from = new Date(d1[2], d1[1] - 1, d1[0]);
                const to = new Date(d2[2], d2[1] - 1, d2[0]);
                const dateCheck = $filter('date')(moment(divergence.date, ['dddd, MMMM DD, YYYY']).format('DD/MM/YYYY'), 'dd/MM/yyyy');
                const c = dateCheck.split('/');
                const check = new Date(c[2], c[1] - 1, c[0]);
                return check >= from && check <= to;
            }
            return resultFilterDate;
        } else {
            return divergence;
        }
    };

    $scope.$watchCollection('itemsFiltered', () => {
        totalBalanceCalc($scope.itemsFiltered, true);
    });

    $scope.login = auth => {
        const authData = encode(`${auth.user}:${auth.password}`);
        $http.defaults.headers.common['Authorization'] = 'Basic ' + authData;
        $http.post('login')
            .then(() => {
                sessionStorage.user = auth.user;
                sessionStorage.password = auth.password;
                $scope.getClockByDate().then(() => {
                    $('#modal_login').modal('hide');
                    $scope.isLogged = true;
                });
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

    $scope.onSaveHours = () => {
        const times = [];
        times.push(saveHours($scope.divergence, $scope.hour01));
        times.push(saveHours($scope.divergence, $scope.hour02));
        times.push(saveHours($scope.divergence, $scope.hour03));
        times.push(saveHours($scope.divergence, $scope.hour04));
        times.push(saveHours($scope.divergence, $scope.hour05));
        times.push(saveHours($scope.divergence, $scope.hour06));

        $scope.divergence.date = $filter('date')($scope.date, 'EEEE, dd/MM/yyyy');
        $scope.divergence.hours = times.join(' ').trim();

        $http.post('clocks', $scope.divergence)
            .then(response => {
                if (response.status === 200) {
                    getClocks().then(() => $('#modal_list_hours').modal('hide'));
                } else {
                    alert('Erro interno, consulte o log ;)');
                }
            })
            .catch(err => {
                alert('Erro interno, consulte o log ;)');
                console.error(err);//eslint-disable-line
            });
    };

    $('#modal_list_hours').on('show.bs.modal', () => {
        getClocks();
        $scope.$apply();
    });

    $scope.onDelete = id => {
        if (confirm('Confirma delete???')) {
            $http.delete(`clocks/${id}`)
                .then(response => {
                    if (response.status === 200) {
                        getClocks();
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